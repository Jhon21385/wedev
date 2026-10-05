/* ============================================================================
   RENDER SMOKE
   Renders every route through React into a JSDOM document, flushin effects and
   timers, then asserts that the real page content appeared. This catches
   runtime faults a type-check cannot: undefined access in a derived value,
   bad computations (NaN leaking into text), empty renders and hook misuse.
   It is not a visual test — the preview is.
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
Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetHeight', { value: 600, configurable: true })
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

const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { createElement, act } = await import('react')
const { App } = await import('@/app/App')

const routes: { path: string; marker: string }[] = [
  { path: '/', marker: 'Creator pulse' },
  { path: '/content?view=table', marker: 'Content database' },
  { path: '/content?view=board', marker: 'drag a card to change its stage' },
  { path: '/content?view=calendar', marker: 'Drag any card to reschedule' },
  { path: '/content?view=timeline', marker: 'Timeline' },
  { path: '/content?view=gallery', marker: 'Not published' },
  { path: '/content/ct-agent', marker: 'Production checklist' },
  { path: '/calendar', marker: 'cadence' },
  { path: '/ideas', marker: 'Idea vault' },
  { path: '/research', marker: 'Research hub' },
  { path: '/analytics', marker: 'Performance intelligence' },
  { path: '/audience', marker: 'When they listen' },
  { path: '/revenue', marker: 'Business ledger' },
  { path: '/assets', marker: 'Asset library' },
  { path: '/brand', marker: 'Voice' },
  { path: '/inbox', marker: 'Notification rules' },
  { path: '/workflow', marker: 'Content types' },
  { path: '/compose', marker: 'Shared source' },
  { path: '/compose?content=ct-agent', marker: 'Pre-flight' },
  { path: '/settings?tab=connections', marker: 'Publishing transport' },
  { path: '/settings?tab=types', marker: 'Workflow stages' },
  { path: '/nope', marker: 'This route does not exist' },
]

let failures = 0
for (const route of routes) {
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  try {
    await act(async () => {
      root.render(createElement(MemoryRouter, { initialEntries: [route.path] }, createElement(App)))
    })
    /* Flush the skeleton timers and any deferred state. */
    await act(async () => {
      await new Promise((r) => setTimeout(r, 420))
    })

    const text = (container.textContent ?? '').replace(/\s+/g, ' ')
    const problems: string[] = []
    if (!text.includes(route.marker)) problems.push(`missing marker "${route.marker}"`)
    if (text.length < 560) problems.push(`only ${text.length} chars rendered`)
    const nan = (text.match(/NaN/g) ?? []).length
    const undef = (text.match(/undefined/g) ?? []).length
    if (nan) problems.push(`${nan}× NaN in output`)
    if (undef) problems.push(`${undef}× "undefined" in output`)

    if (problems.length) {
      failures++
      console.error(`✗ ${route.path.padEnd(26)} ${problems.join(' · ')}`)
    } else {
      console.log(`✓ ${route.path.padEnd(26)} ${String(text.length).padStart(6)} chars · ${String(container.querySelectorAll('*').length).padStart(5)} nodes`)
    }
  } catch (err) {
    failures++
    console.error(`✗ ${route.path}`)
    console.error(err instanceof Error ? err.stack?.split('\n').slice(0, 8).join('\n') : err)
  } finally {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
}

console.log(failures === 0 ? `\nAll ${routes.length} routes rendered with real content.` : `\n${failures} route(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
