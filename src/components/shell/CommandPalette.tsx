import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Command,
  CornerDownLeft,
  Database,
  FileText,
  FlaskConical,
  Hash,
  Lightbulb,
  Palette,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { searchAll, type SearchHit } from '@/analytics/queries'
import { Badge } from '@/components/ui/Surface'
import { Kbd } from '@/components/ui/Tooltip'


/* ============================================================================
   COMMAND PALETTE  (⌘K)
   Three layers in one input: navigation, creation, and full-content search.
   Arrow keys move, Enter runs, ⌘↵ opens in the side panel. Recent items are
   always the first group so repeat visits cost two keystrokes.
   ========================================================================== */

interface CommandItem {
  id: string
  label: string
  hint?: string
  group: string
  icon: React.ReactNode
  run: () => void
  meta?: string
  score?: number
}

const NAV_COMMANDS = [
  { id: 'go-dashboard', label: 'Dashboard', route: '/', icon: <TrendingUp />, hint: 'D' },
  { id: 'go-content', label: 'Content database', route: '/content', icon: <Database />, hint: 'C' },
  { id: 'go-calendar', label: 'Calendar', route: '/calendar', icon: <CalendarDays /> },
  { id: 'go-ideas', label: 'Idea vault', route: '/ideas', icon: <Lightbulb />, hint: 'I' },
  { id: 'go-research', label: 'Research hub', route: '/research', icon: <FlaskConical /> },
  { id: 'go-analytics', label: 'Analytics', route: '/analytics', icon: <BarChart3 />, hint: 'A' },
  { id: 'go-audience', label: 'Audience', route: '/audience', icon: <Users /> },
  { id: 'go-revenue', label: 'Revenue', route: '/revenue', icon: <Wallet /> },
  { id: 'go-assets', label: 'Asset library', route: '/assets', icon: <Boxes /> },
  { id: 'go-brand', label: 'Brand system', route: '/brand', icon: <Palette /> },
  { id: 'go-settings', label: 'Settings', route: '/settings', icon: <Settings /> },
]

export function CommandPalette() {
  const open = useApp((s) => s.commandOpen)
  const setOpen = useApp((s) => s.setCommandOpen)
  const ds = useDataset()
  const navigate = useNavigate()
  const recents = useApp((s) => s.recents)
  const visit = useApp((s) => s.visit)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const openPanel = useApp((s) => s.openPanel)
  const pushToast = useApp((s) => s.pushToast)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase()
    const out: CommandItem[] = []

    const matches = (text: string) => !q || text.toLowerCase().includes(q)

    /* 1 — recents (only when not searching) */
    if (!q && recents.length) {
      recents.slice(0, 4).forEach((r) =>
        out.push({
          id: `recent-${r.id}`,
          label: r.title,
          group: 'Recent',
          meta: 'recent',
          icon: <CornerDownLeft />,
          run: () => go(r.href),
        }),
      )
    }

    /* 2 — creation */
    const creates = [
      { id: 'new-content', label: 'New content', hint: 'C', icon: <Plus /> },
      { id: 'new-idea', label: 'New idea', hint: 'I', icon: <Lightbulb /> },
      { id: 'new-script', label: 'New script', icon: <FileText /> },
      { id: 'new-research', label: 'New research note', icon: <FlaskConical /> },
      { id: 'new-campaign', label: 'New campaign', icon: <Sparkles /> },
      { id: 'new-type', label: 'Create custom content type', icon: <Plus /> },
      { id: 'new-asset', label: 'Upload asset', icon: <Boxes /> },
    ]
    creates
      .filter((c) => matches(c.label))
      .forEach((c) =>
        out.push({
          id: c.id,
          label: c.label,
          hint: c.hint,
          group: 'Create',
          icon: c.icon,
          run: () => {
            setOpen(false)
            setCreateOpen(true, c.id)
            if (c.id === 'new-idea') navigate('/ideas?new=1')
            else if (c.id === 'new-research') navigate('/research?new=1')
            else if (c.id === 'new-asset') navigate('/assets?upload=1')
            else if (c.id === 'new-type') navigate('/settings?tab=types')
            else if (c.id === 'new-campaign') navigate('/revenue?new=campaign')
            else navigate(`/content?new=1${c.id === 'new-script' ? '&preset=script' : ''}`)
          },
        }),
      )

    /* 3 — actions */
    const actions: CommandItem[] = [
      { id: 'act-analytics', label: 'Analyse content performance matrix', group: 'Actions', icon: <BarChart3 />, run: () => go('/analytics?section=matrix') },
      { id: 'act-pipeline', label: 'Review pipeline health', group: 'Actions', icon: <TrendingUp />, run: () => go('/analytics?section=overview') },
      { id: 'act-deals', label: 'Open brand deal pipeline', group: 'Actions', icon: <Wallet />, run: () => go('/revenue?tab=deals') },
      { id: 'act-calendar', label: 'Schedule this week’s publishing slate', group: 'Actions', icon: <CalendarDays />, run: () => go('/calendar?view=week') },
      { id: 'act-gaps', label: 'Find untapped topics', group: 'Actions', icon: <Hash />, run: () => go('/analytics?section=topics') },
      { id: 'act-repurp', label: 'Show repurposing opportunities', group: 'Actions', icon: <Zap />, run: () => go('/analytics?section=roi') },
    ]
    actions.filter((a) => matches(a.label)).forEach((a) => out.push(a))

    /* 4 — navigation */
    NAV_COMMANDS.filter((n) => matches(n.label)).forEach((n) =>
      out.push({ id: n.id, label: n.label, hint: n.hint, group: 'Navigate', icon: n.icon, run: () => go(n.route) }),
    )

    /* 5 — content results */
    if (q) {
      const hits = searchAll(ds, q, 14)
      hits.forEach((h) => {
        out.push({
          id: `hit-${h.id}`,
          label: h.title,
          group: 'Results',
          meta: h.meta,
          icon: hitIcon(h),
          run: () => go(h.href),
        })
      })
    }

    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ds, recents])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const it of items) {
      if (!map.has(it.group)) map.set(it.group, [])
      map.get(it.group)!.push(it)
    }
    return [...map.entries()]
  }, [items])

  function go(href: string) {
    setOpen(false)
    navigate(href)
  }

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, items.length - 1)))
  }, [items.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor((c) => (c + 1) % Math.max(1, items.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor((c) => (c - 1 + items.length) % Math.max(1, items.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = items[cursor]
        if (!item) return
        if (e.metaKey || e.ctrlKey) {
          const hit = item.id.startsWith('hit-') ? ds.content.find((c) => c.id === item.id.slice(4)) : undefined
          setOpen(false)
          if (hit) {
            visit({ id: hit.id, title: hit.title, href: `/content/${hit.id}` })
            openPanel('content', { contentId: hit.id })
            navigate('/analytics')
          }
        } else {
          item.run()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, cursor, ds, navigate, openPanel, setOpen, visit])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  let flatIndex = -1

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[9vh]">
      <div className="fixed inset-0 animate-[fade-in_180ms_var(--ease-cockpit)_both] bg-black/62 backdrop-blur-[3px]" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-[640px] animate-[pop_240ms_var(--ease-cockpit)_both] overflow-hidden rounded-2xl border border-line-3 bg-surface-1/98 shadow-[0_50px_140px_-30px_rgba(0,0,0,1),0_0_70px_-30px_rgba(91,157,255,0.55)]"
      >
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" aria-hidden />

        <div className="flex items-center gap-3 border-b border-line-2 px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-ink-low" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setCursor(0)
            }}
            placeholder="Search content, ideas, research, assets — or run a command"
            aria-label="Command palette search"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink-hi placeholder:text-ink-faint focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
          {grouped.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-[12.5px] text-ink-mid">No matches for “{query}”</p>
              <p className="mt-1 text-[11.5px] text-ink-low">Try a topic, a platform, or a content code like CN-AGENT.</p>
            </div>
          )}
          {grouped.map(([group, groupItems]) => (
            <div key={group} className="mb-1">
              <p className="cell-label px-2.5 pb-1 pt-2">{group}</p>
              {groupItems.map((item) => {
                flatIndex++
                const idx = flatIndex
                const active = idx === cursor
                return (
                  <button
                    key={item.id}
                    data-index={idx}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) {
                        const hit = item.id.startsWith('hit-') ? ds.content.find((c) => c.id === item.id.slice(4)) : undefined
                        setOpen(false)
                        if (hit) {
                          visit({ id: hit.id, title: hit.title, href: `/content/${hit.id}` })
                          openPanel('content', { contentId: hit.id })
                          navigate('/analytics')
                        }
                        return
                      }
                      item.run()
                    }}
                    className={cn(
                      'group/opt relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left',
                      'transition-[background-color,color,box-shadow] duration-[var(--duration-1)] ease-[var(--ease-cockpit)]',
                      active
                        ? 'bg-white/[0.075] text-ink-hi shadow-[inset_2px_0_0_0_rgba(91,157,255,0.8),0_0_20px_-14px_rgba(91,157,255,0.9)]'
                        : 'text-ink hover:bg-white/[0.04]',
                    )}
                  >
                    <span className={cn('shrink-0 transition-colors [&>svg]:h-3.5 [&>svg]:w-3.5', active ? 'text-accent' : 'text-ink-faint')}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{item.label}</span>
                    {item.meta && <span className="mono shrink-0 text-[10px] text-ink-faint">{item.meta}</span>}
                    {item.hint && <Kbd>{item.hint}</Kbd>}
                    {active && <ArrowRight className="h-3.5 w-3.5 shrink-0 animate-[slide-left_.18s_var(--ease-out-quint)_both] text-accent" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-2 bg-white/[0.014] px-3.5 py-2">
          <div className="flex items-center gap-3 text-[10.5px] text-ink-faint">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>⌘↵</Kbd> open in panel
            </span>
          </div>
          <span className="mono flex items-center gap-1.5 text-[10px] text-ink-ghost">
            <Command className="h-3 w-3" /> creator os
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function hitIcon(h: SearchHit) {
  switch (h.kind) {
    case 'content':
      return <FileText />
    case 'idea':
      return <Lightbulb />
    case 'research':
      return <FlaskConical />
    case 'asset':
      return <Boxes />
    case 'deal':
      return <Wallet />
    default:
      return <Search />
  }
}

/* -------------------------------------------------------------------------- */
/* SHORTCUT SHEET                                                              */
/* -------------------------------------------------------------------------- */
export function ShortcutsSheet() {
  const open = useApp((s) => s.shortcutsOpen)
  const setOpen = useApp((s) => s.setShortcutsOpen)
  const groups = [
    {
      label: 'Global',
      items: [
        { keys: ['⌘', 'K'], label: 'Command palette' },
        { keys: ['/'], label: 'Search' },
        { keys: ['C'], label: 'Create content' },
        { keys: ['I'], label: 'New idea' },
        { keys: ['A'], label: 'Analytics' },
        { keys: ['D'], label: 'Dashboard' },
        { keys: ['?'], label: 'This sheet' },
        { keys: ['Esc'], label: 'Close panels' },
      ],
    },
    {
      label: 'Navigation',
      items: [
        { keys: ['G', 'C'], label: 'Go to content' },
        { keys: ['G', 'A'], label: 'Go to analytics' },
        { keys: ['G', 'R'], label: 'Go to research' },
        { keys: ['G', 'V'], label: 'Go to revenue' },
        { keys: ['⌘', '\\'], label: 'Toggle sidebar' },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { keys: ['⌘', '↵'], label: 'Open result in side panel' },
        { keys: ['E'], label: 'Toggle right context panel' },
        { keys: ['⌘', 'S'], label: 'Save (autosaves anyway)' },
        { keys: ['⌘', 'Z'], label: 'Undo last change' },
        { keys: ['⌘', '⇧', 'M'], label: 'Toggle reduced motion' },
      ],
    },
  ]

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="fixed inset-0 animate-[fade-in_180ms_var(--ease-cockpit)_both] bg-black/62 backdrop-blur-[3px]" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="relative w-full max-w-[700px] animate-[pop_240ms_var(--ease-cockpit)_both] overflow-hidden rounded-2xl border border-line-3 bg-surface-1/98 shadow-[0_50px_140px_-30px_rgba(0,0,0,1),0_0_70px_-30px_rgba(91,157,255,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-line-2 px-5 py-3.5">
          <div>
            <h2 className="text-[13.5px] font-semibold text-ink-hi">Keyboard shortcuts</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-low">Every surface in Creator OS is reachable without the mouse.</p>
          </div>
          <Badge tone="accent" size="xs" mono>
            ⌘K first
          </Badge>
        </div>
        <div className="grid gap-6 p-5 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="cell-label mb-2.5">{g.label}</p>
              <ul className="space-y-2">
                {g.items.map((it) => (
                  <li key={it.label} className="flex items-center justify-between gap-3">
                    <span className="text-[11.5px] text-ink-mid">{it.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {it.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
