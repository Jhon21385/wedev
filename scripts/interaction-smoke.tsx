/* ============================================================================
   INTERACTION SMOKE
   Exercises the flows a person actually performs — open the palette, change a
   status, drag a board card, promote an idea, filter by platform — and asserts
   the interface responded. Rendering alone does not prove the product works.
   ========================================================================== */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html data-theme="dark" data-motion="full"><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
})
const g = globalThis as unknown as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true, writable: true })
g.HTMLElement = dom.window.HTMLElement
g.Element = dom.window.Element
g.Node = dom.window.Node
g.SVGElement = dom.window.SVGElement
g.getComputedStyle = dom.window.getComputedStyle
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number
g.cancelAnimationFrame = (id: number) => clearTimeout(id)
g.IS_REACT_ACT_ENVIRONMENT = true
const matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})
g.matchMedia = matchMedia
;(dom.window as unknown as Record<string, unknown>).matchMedia = matchMedia
dom.window.HTMLElement.prototype.scrollIntoView = () => undefined
dom.window.HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, opts?: ScrollToOptions | number) {
  this.scrollTop = typeof opts === 'number' ? opts : (opts?.top ?? 0)
}
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { value: 1440, configurable: true })
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientHeight', { value: 900, configurable: true })
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  root = null
  rootMargin = ''
  thresholds = []
}
g.ResizeObserver = Observer
g.IntersectionObserver = Observer
g.IntersectionObserverEntry = class {}
g.ClipboardEvent = dom.window.Event

const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { createElement, act } = await import('react')
const { App } = await import('@/app/App')
const { useApp } = await import('@/store/app')

type Root = ReturnType<typeof createRoot>

const results: { name: string; ok: boolean; note?: string }[] = []
function check(name: string, ok: boolean, note?: string) {
  results.push({ name, ok, note })
  console.log(`${ok ? '✓' : '✗'} ${name}${note ? ` — ${note}` : ''}`)
}

async function mount(route: string) {
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [route] }, createElement(App)))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 420))
  })
  return { container, root: root as Root }
}

async function unmount(handle: { container: HTMLElement; root: Root }) {
  await act(async () => {
    handle.root.unmount()
  })
  handle.container.remove()
}

const text = (node: Element | null) => (node?.textContent ?? '').replace(/\s+/g, ' ')

function findByText(root: Element, selector: string, needle: string): HTMLElement | null {
  return ([...root.querySelectorAll(selector)] as HTMLElement[]).find((el) => text(el).includes(needle)) ?? null
}

async function fire(el: Element, type: string, init: EventInit = { bubbles: true }) {
  await act(async () => {
    el.dispatchEvent(new dom.window.Event(type, init))
  })
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

await act(async () => {
  await Promise.resolve()
})

/* --- 1. command palette opens with ⌘K and closes with Escape --------------- */
{
  const h = await mount('/')
  await act(async () => {
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  })
  const open = useApp.getState().commandOpen
  await act(async () => {
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  check('⌘K opens the command palette, Escape closes it', open && !useApp.getState().commandOpen)
  await unmount(h)
}

/* --- 2. content detail: status change produces an undoable toast ----------- */
{
  const h = await mount('/content/ct-agent')
  const publishBtn = findByText(h.container, 'button', 'Publish')
  const before = useApp.getState().updatedContent['ct-agent']?.status
  const editChip = findByText(h.container, 'button', 'Editing')
  if (editChip) await click(editChip)
  const after = useApp.getState().updatedContent['ct-agent']?.status
  const toast = useApp.getState().toasts.at(-1)
  check('status change updates the store and raises an undo toast', after === 'editing' && !!toast?.action, `status ${before ?? 'review'} → ${after}`)
  check('publish action is present on the detail header', !!publishBtn)
  await unmount(h)
}

/* --- 3. board drag & drop moves a card between lanes ---------------------- */
{
  const h = await mount('/content?view=board')
  const card = h.container.querySelector('[draggable="true"]') as HTMLElement | null
  const lanes = [...h.container.querySelectorAll('section')] as HTMLElement[]
  const target = lanes.find((l) => text(l).includes('Editing'))
  if (card && target) {
    await fire(card, 'dragstart')
    await fire(target, 'dragover')
    await fire(target, 'drop')
  }
  const toast = useApp.getState().toasts.at(-1)
  check('dragging a board card raises a move toast with undo', !!toast?.title?.startsWith('Moved to'), toast?.title)
  await unmount(h)
}

/* --- 4. platform filter changes the numbers every screen reads ------------- */
{
  const h = await mount('/')
  const chip = [...h.container.querySelectorAll('[aria-pressed]')].find((b) => text(b).length <= 4) as HTMLElement | undefined
  const before = useApp.getState().filters.platforms.length
  if (chip) await click(chip)
  const after = useApp.getState().filters.platforms
  const chipLabel = chip ? `${text(chip)} (title: ${chip.getAttribute('title')})` : 'chip not found'
  check('platform chip toggles the global filter', after.length !== before, `${chipLabel} → platforms: [${after.join(', ') || 'all'}]`)
  await unmount(h)
}

/* --- 5. idea drawer opens and offers promotion ---------------------------- */
{
  const h = await mount('/ideas')
  const card = h.container.querySelector('article') as HTMLElement | null
  const before = dom.window.document.body.querySelectorAll('[role="dialog"]').length
  if (card) await click(card)
  const body = dom.window.document.body
  const dialog = body.querySelector('[role="dialog"]')
  const promote = findByText(body, 'button', 'Promote to content')
  check(
    'clicking an idea opens the scorecard drawer with promotion',
    before === 0 && !!promote && !!dialog,
    `${before} → ${body.querySelectorAll('[role="dialog"]').length} dialog(s), promotion control ${promote ? 'present' : 'missing'}`,
  )
  await unmount(h)
}

/* --- 6. idea promotion raises a confirmation toast ----------------------- */
{
  const h = await mount('/ideas')
  const card = h.container.querySelector('article')
  if (card) await click(card)
  const body = dom.window.document.body
  const promote = findByText(body, 'button', 'Promote to content')
  if (promote) await click(promote)
  const toast = useApp.getState().toasts.at(-1)
  check('promotion confirms with a toast', toast?.title === 'Promoted to content', toast?.title)
  await unmount(h)
}

/* --- 7. research: kind filter narrows the library ------------------------ */
{
  const h = await mount('/research')
  const before = h.container.querySelectorAll('article').length
  const chip = findByText(h.container, 'button', 'Statistic')
  if (chip) await click(chip)
  const after = h.container.querySelectorAll('article').length
  check('research kind filter narrows the grid', after > 0 && after < before, `${before} → ${after} cards`)
  await unmount(h)
}

/* --- 8. settings: motion preference is real state ------------------------ */
{
  const h = await mount('/settings?tab=appearance')
  const reduced = findByText(h.container, 'button', 'Reduced')
  if (reduced) await click(reduced)
  check('motion preference writes to the store', useApp.getState().motion === 'reduced', useApp.getState().motion)
  await unmount(h)
}

/* --- 9. asset drawer surfaces orphan / usage metadata ------------------- */
{
  const h = await mount('/assets')
  const card = h.container.querySelector('article')
  if (card) {
    const open = card.querySelector('button')
    if (open) await click(open)
  }
  const body = dom.window.document.body
  check('asset drawer lists where the file is used', /Used in/.test(text(body)), text(body).match(/Used in \d+ piece/)?.[0])
  await unmount(h)
}

/* --- 10. every chart has an accessible summary and a data-table view ------ */
{
  const h = await mount('/')
  const summaries = [...h.container.querySelectorAll('p.sr-only')].map((el) => text(el)).filter(Boolean)
  const toggles = [...h.container.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') ?? '').includes('as a table'))
  const before = h.container.querySelectorAll('table').length
  if (toggles[0]) await click(toggles[0])
  const after = h.container.querySelectorAll('table').length
  const caption = h.container.querySelector('table caption')
  check(
    'charts expose a spoken summary and a show-as-table toggle',
    summaries.length > 0 && toggles.length > 0 && after > before && !!caption,
    `${summaries.length} summary/summaries, ${toggles.length} toggle(s), ${before} → ${after} table(s)`,
  )
  if (toggles[0]) await click(toggles[0])
  const restored = h.container.querySelectorAll('table').length
  check('toggling back restores the chart', restored === before, `${after} → ${restored} table(s)`)
  await unmount(h)
}

const failed = results.filter((r) => !r.ok)
console.log(failed.length === 0 ? `\nAll ${results.length} interaction checks passed.` : `\n${failed.length} of ${results.length} checks failed.`)
process.exit(failed.length === 0 ? 0 : 1)
