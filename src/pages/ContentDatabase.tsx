import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Columns3,
  Filter,
  GanttChartSquare,
  Grid2x2,
  LayoutList,
  Plus,
  Rows3,
  SlidersHorizontal,
  Sparkles,
  Table2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { contentTypeById, platformById, statusById } from '@/data/registry'
import { fmtDate, fmtNumber, fmtRelativeFuture, relativeDays } from '@/lib/format'
import { contentRows, scopeContent, topicColor, type ContentRow } from '@/analytics/queries'
import { resolvePeriod } from '@/analytics/periods'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge, EmptyState, Panel, PanelHeader, Progress, Skeleton, StatusPill } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader } from '@/components/ui/Page'
import { Segmented, SearchInput } from '@/components/ui/Field'
import { Popover } from '@/components/ui/Overlay'
import { Thumb } from '@/components/ui/Thumb'
import { Sparkline } from '@/components/charts/LineArea'
import { FilterBar } from '@/components/shell/FilterBar'

/* ============================================================================
   CONTENT DATABASE
   Five projections of one dataset. Switching a view never loses scope: the
   filter bar applies identically to table, board, calendar, timeline and
   gallery, because they are all rendering the same query result.
   ========================================================================== */

type ViewId = 'table' | 'board' | 'calendar' | 'timeline' | 'gallery'

const VIEWS: { id: ViewId; label: string; icon: typeof Table2 }[] = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'board', label: 'Board', icon: Columns3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'gallery', label: 'Gallery', icon: Grid2x2 },
]

export function ContentDatabase() {
  const ds = useDataset()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filters = useApp((s) => s.filters)
  const setFilterList = useApp((s) => s.setFilterList)
  const openPanel = useApp((s) => s.openPanel)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const density = useApp((s) => s.density)
  const setDensity = useApp((s) => s.setDensity)
  const settled = useSettled(240)

  const view = (params.get('view') as ViewId) ?? 'table'
  const [query, setQuery] = useState('')

  /* Query-string → filter state. Makes every workspace saved view shareable,
     and keeps sidebar links honest: leaving a status scope clears it. */
  const lastStatusParam = useRef<string | null>(null)
  useEffect(() => {
    const statusParam = params.get('status')
    if (statusParam !== lastStatusParam.current) {
      lastStatusParam.current = statusParam
      const list = statusParam ? statusParam.split(',').filter(Boolean) : []
      const current = useApp.getState().filters.statuses
      if (list.join(',') !== current.join(',')) setFilterList('statuses', list)
    }
    if (params.get('new')) setCreateOpen(true, params.get('preset') ?? 'content')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const setView = (v: ViewId) => {
    const next = new URLSearchParams(params)
    next.set('view', v)
    setParams(next, { replace: true })
  }

  const period = resolvePeriod(filters.period, filters.customFrom, filters.customTo)
  const scoped = useMemo(() => scopeContent(ds, filters, period), [ds, filters, period])
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q)) ||
        c.brief.hook.toLowerCase().includes(q),
    )
  }, [scoped, query])

  const perfRows = useMemo(() => contentRows(ds, filters), [ds, filters])
  const perfById = useMemo(() => new Map(perfRows.map((r) => [r.id, r])), [perfRows])

  const stats = useMemo(() => {
    const byStatus = new Map<string, number>()
    searched.forEach((c) => byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1))
    const overdue = searched.filter((c) => c.deadline && (relativeDays(c.deadline) ?? 0) < 0 && !['published', 'archived'].includes(c.status)).length
    const inFlight = searched.filter((c) => !['published', 'archived', 'idea'].includes(c.status)).length
    const tagged = searched.filter((c) => c.tags.length).length
    return { byStatus, overdue, inFlight, tagged }
  }, [searched])

  if (!settled) return <DatabaseSkeleton />

  return (
    <Page width="full" className="px-0 py-0">
      <div className="px-4 pt-5 lg:px-6">
        <PageHeader
          eyebrow="Content"
          title="Content database"
          description="Every piece in the operation, one graph. Ideas become briefs become scripts become published assets — and each derivative keeps a link to its origin."
          meta={<FilterBar showCustomRange />}
          actions={
            <>
              <Button variant="secondary" size="md" icon={<SlidersHorizontal />} onClick={() => navigate('/settings?tab=types')}>
                Manage types
              </Button>
              <Button variant="primary" size="md" icon={<Plus />} onClick={() => setCreateOpen(true, 'content')}>
                New content
              </Button>
            </>
          }
        />
      </div>

      {/* ---- view toolbar ------------------------------------------------ */}
      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 border-y border-line-2 bg-base/85 px-4 py-2.5 backdrop-blur-xl lg:px-6">
        <Segmented
          ariaLabel="Content view"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({
            id: v.id,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </span>
            ),
            title: v.label,
          }))}
        />

        <div className="hidden h-4 w-px bg-line-2 sm:block" />

        <div className="w-[190px] max-w-full">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title, tag, hook…" onClear={() => setQuery('')} />
        </div>

        <StatusQuickFilter counts={stats.byStatus} />

        <div className="ml-auto flex items-center gap-1.5">
          {stats.overdue > 0 && (
            <Badge tone="danger" size="sm">
              <AlertTriangle className="h-3 w-3" /> {stats.overdue} overdue
            </Badge>
          )}
          <span className="mono hidden text-[10.5px] text-ink-faint md:inline">{searched.length} of {ds.content.length}</span>
          {view === 'table' && (
            <IconButton
              label={density === 'compact' ? 'Comfortable density' : 'Compact density'}
              icon={density === 'compact' ? <Rows3 /> : <LayoutList />}
              onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
            />
          )}
          <GroupByMenu />
        </div>
      </div>

      {/* ---- active view ------------------------------------------------- */}
      <div className={cn('px-4 lg:px-6', view === 'calendar' && 'pb-4')}>
        {view === 'table' && <TableView rows={searched} perfById={perfById} onOpen={(r) => openPanel('content', { contentId: r.id })} onNavigate={(id) => navigate(`/content/${id}`)} />}
        {view === 'board' && <BoardView rows={searched} perfById={perfById} onNavigate={(id) => navigate(`/content/${id}`)} />}
        {view === 'calendar' && <CalendarView rows={searched} onNavigate={(id) => navigate(`/content/${id}`)} />}
        {view === 'timeline' && <TimelineView rows={searched} onNavigate={(id) => navigate(`/content/${id}`)} />}
        {view === 'gallery' && <GalleryView rows={searched} perfById={perfById} onNavigate={(id) => navigate(`/content/${id}`)} />}
      </div>
    </Page>
  )
}

/* ============================================================================
   TABLE
   ========================================================================== */
function TableView({
  rows,
  perfById,
  onOpen,
  onNavigate,
}: {
  rows: ReturnType<typeof scopeContent>
  perfById: Map<string, ContentRow>
  onOpen: (row: { id: string }) => void
  onNavigate: (id: string) => void
}) {
  const ds = useDataset()
  const columns: Column<(typeof rows)[number]>[] = [
    {
      id: 'title',
      header: 'Title',
      primary: true,
      width: 320,
      sortValue: (r) => r.title,
      filterValue: (r) => r.title,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="relative h-7 w-11 shrink-0 overflow-hidden rounded-[5px]">
            <Thumb seed={r.thumbnailSeed} accent={platformById(r.platforms[0]).color} compact className="h-full w-full" aspect="auto" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] text-ink-hi">{r.title}</span>
            <span className="mono flex items-center gap-1.5 truncate text-[9.5px] text-ink-faint">
              {r.code}
              {r.parentId && <span className="text-accent/70">↳ derivative</span>}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 132,
      sortValue: (r) => contentTypeById(r.typeId).name,
      filterValue: (r) => contentTypeById(r.typeId).name,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-mid">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: contentTypeById(r.typeId).color }} />
          <span className="truncate">{contentTypeById(r.typeId).name}</span>
        </span>
      ),
    },
    {
      id: 'platform',
      header: 'Platform',
      width: 118,
      sortValue: (r) => r.platforms[0],
      filterValue: (r) => r.platforms.map((p) => platformById(p).name).join(' + '),
      cell: (r) => (
        <span className="flex items-center gap-1">
          {r.platforms.map((p) => (
            <span key={p} className="text-[10.5px] font-medium" style={{ color: platformById(p).color }}>
              {platformById(p).short}
            </span>
          ))}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 122,
      sortValue: (r) => statusById(r.status).order,
      filterValue: (r) => statusById(r.status).name,
      cell: (r) => <StatusPill name={statusById(r.status).name} color={statusById(r.status).accent} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      width: 94,
      sortValue: (r) => ['low', 'medium', 'high', 'critical'].indexOf(r.priority),
      filterValue: (r) => r.priority,
      cell: (r) => (
        <Badge tone={r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warn' : r.priority === 'medium' ? 'neutral' : 'outline'} size="xs">
          {r.priority}
        </Badge>
      ),
    },
    {
      id: 'topic',
      header: 'Topic',
      width: 130,
      sortValue: (r) => ds.topics.find((t) => t.id === r.topicId)?.name ?? '',
      filterValue: (r) => ds.topics.find((t) => t.id === r.topicId)?.name ?? '—',
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-mid">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: topicColor(ds, r.topicId) }} />
          <span className="truncate">{ds.topics.find((t) => t.id === r.topicId)?.name ?? '—'}</span>
        </span>
      ),
    },
    {
      id: 'publish',
      header: 'Publish',
      width: 96,
      sortValue: (r) => r.publishDate ?? '9999',
      cell: (r) => <span className="mono text-[10.5px] text-ink-low">{r.publishDate ? fmtDate(r.publishDate, 'short') : '—'}</span>,
    },
    {
      id: 'deadline',
      header: 'Deadline',
      width: 100,
      sortValue: (r) => r.deadline ?? '9999',
      cell: (r) => {
        const days = relativeDays(r.deadline)
        if (days === null) return <span className="text-[10.5px] text-ink-faint">—</span>
        return (
          <span className={cn('mono text-[10.5px]', days < 0 ? 'text-rose' : days <= 3 ? 'text-amber' : 'text-ink-low')}>
            {fmtRelativeFuture(r.deadline)}
          </span>
        )
      },
    },
    {
      id: 'perf',
      header: 'Views',
      width: 92,
      align: 'right',
      numeric: true,
      sortValue: (r) => perfById.get(r.id)?.views ?? 0,
      cell: (r) => {
        const perf = perfById.get(r.id)
        return perf ? <span className="text-ink-hi">{fmtNumber(perf.views, { compact: true })}</span> : <span className="text-ink-ghost">—</span>
      },
    },
    {
      id: 'trend',
      header: 'Trend',
      width: 80,
      cell: (r) => {
        const perf = perfById.get(r.id)
        return perf ? <Sparkline values={perf.spark} color={platformById(r.platforms[0]).color} width={58} height={18} /> : null
      },
    },
    {
      id: 'checks',
      header: 'Checks',
      width: 74,
      align: 'right',
      numeric: true,
      sortValue: (r) => r.checklist.filter((c) => c.done).length / r.checklist.length,
      cell: (r) => {
        const done = r.checklist.filter((c) => c.done).length
        const pct = (done / r.checklist.length) * 100
        return (
          <span className="flex items-center justify-end gap-1.5">
            <span className="h-1 w-8 overflow-hidden rounded-full bg-white/[0.07]">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#34D399' : 'var(--color-accent)' }} />
            </span>
            <span className="mono text-[10px] text-ink-faint">
              {done}/{r.checklist.length}
            </span>
          </span>
        )
      },
    },
  ]

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowHeight={44}
      onRowClick={onOpen}
      onRowActivate={(r) => onNavigate(r.id)}
      selectedId={null}
      rowActions={(r) => <IconButton label="Open workspace" icon={<ArrowUpRight />} size="xs" onClick={(e) => { e.stopPropagation(); onNavigate(r.id) }} />}
      empty={
        <EmptyState
          icon={<Sparkles />}
          title="No content matches this scope"
          body="Clear a filter, widen the period, or start something new — an idea is enough to begin."
          actions={
            <>
              <Button variant="primary" size="sm" icon={<Plus />} onClick={() => useApp.getState().setCreateOpen(true, 'content')}>
                Create your first piece
              </Button>
              <Button variant="ghost" size="sm" onClick={() => useApp.getState().clearFilters()}>
                Clear filters
              </Button>
            </>
          }
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-ink-faint">
          <span className="mono">{rows.length} rows · sorted client-side · virtualised above 140 rows</span>
          <span className="mono">click a row for the side panel · ⇧click to open the workspace</span>
        </div>
      }
    />
  )
}

/* ============================================================================
   BOARD — kanban with drag & drop status changes
   ========================================================================== */
function BoardView({
  rows,
  perfById,
  onNavigate,
}: {
  rows: ReturnType<typeof scopeContent>
  perfById: Map<string, ContentRow>
  onNavigate: (id: string) => void
}) {
  const pushToast = useApp((s) => s.pushToast)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  const laneIds = ['idea', 'research', 'brief', 'scripting', 'production', 'editing', 'review', 'ready', 'scheduled']
  const lanes = laneIds.map((id) => ({
    id,
    def: statusById(id),
    items: rows.filter((r) => (overrides[r.id] ?? r.status) === id),
  }))

  return (
    <div className="pb-4">
      <p className="mb-2 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-low">
        <span className="text-ink-mid">{rows.length} pieces across {lanes.length} stages</span>
        <span aria-hidden>·</span>
        <span>drag a card to change its stage — status updates optimistically with undo</span>
      </p>
      <div className="scroll-fade-x overflow-x-auto">
      <div className="flex min-h-[520px] gap-2.5" style={{ width: `${lanes.length * 254}px` }}>
        {lanes.map((lane) => (
          <div
            key={lane.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(lane.id)
            }}
            onDragLeave={() => setOverCol((c) => (c === lane.id ? null : c))}
            onDrop={() => {
              if (!dragId) return
              setOverrides((o) => ({ ...o, [dragId]: lane.id }))
              const item = rows.find((r) => r.id === dragId)
              pushToast({
                kind: 'success',
                title: `Moved to ${lane.def.name}`,
                body: item ? `“${item.title}” — status updated optimistically.` : undefined,
                action: { label: 'Undo', run: () => setOverrides((o) => ({ ...o, [dragId]: item?.status ?? 'idea' })) },
              })
              setDragId(null)
              setOverCol(null)
            }}
            className={cn(
              'flex w-[244px] shrink-0 flex-col rounded-xl border bg-panel/70',
              'transition-[border-color,background-color,box-shadow] duration-[var(--duration-2)] ease-[var(--ease-cockpit)]',
              overCol === lane.id ? 'border-accent/45 bg-accent/[0.05] glow-1' : 'border-line-2 hover:border-line-3',
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-line-1 px-2.5 py-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: lane.def.accent, boxShadow: `0 0 7px ${lane.def.accent}99` }} />
                <span className="text-[11.5px] font-medium text-ink-hi">{lane.def.name}</span>
              </span>
              <span className="mono text-[10px] text-ink-faint">{lane.items.length}</span>
            </header>
            <div className="scroll-fade-y min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
              {lane.items.map((item) => {
                const perf = perfById.get(item.id)
                const days = relativeDays(item.deadline)
                const late = days !== null && days < 0
                return (
                  <article
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'group relative cursor-pointer rounded-lg border border-line-2 bg-surface-1 p-2.5',
                      'transition-[border-color,box-shadow,transform,opacity] duration-[var(--duration-2)] ease-[var(--ease-cockpit)]',
                      'hover:-translate-y-px hover:border-line-3 hover:shadow-[0_12px_26px_-16px_rgba(0,0,0,1)] active:translate-y-0',
                      dragId === item.id && 'opacity-40',
                      item.priority === 'critical' && 'border-l-2 border-l-rose/70',
                      item.priority === 'high' && 'border-l-2 border-l-amber/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug text-ink-hi">{item.title}</p>
                      <span className="mono shrink-0 text-[9px] text-ink-ghost">{item.code.slice(-4)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {item.platforms.map((p) => (
                        <span key={p} className="rounded px-1 py-px text-[9px] font-medium" style={{ background: `${platformById(p).color}1F`, color: platformById(p).color }}>
                          {platformById(p).short}
                        </span>
                      ))}
                      <span className="truncate text-[9.5px] text-ink-faint">{contentTypeById(item.typeId).name}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1 w-9 overflow-hidden rounded-full bg-white/[0.07]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(item.checklist.filter((c) => c.done).length / item.checklist.length) * 100}%`,
                              background: 'var(--color-accent)',
                            }}
                          />
                        </span>
                        <span className="mono text-[9px] text-ink-faint">{item.effortHours}h</span>
                      </span>
                      {item.deadline && (
                        <span className={cn('mono text-[9px]', late ? 'text-rose' : days !== null && days <= 3 ? 'text-amber' : 'text-ink-faint')}>
                          {fmtRelativeFuture(item.deadline)}
                        </span>
                      )}
                    </div>
                    {perf && (
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line-1 pt-2">
                        <span className="mono text-[9.5px] text-ink-mid">{fmtNumber(perf.views, { compact: true })} views</span>
                        <Sparkline values={perf.spark} color={platformById(item.platforms[0]).color} width={44} height={14} />
                      </div>
                    )}
                  </article>
                )
              })}
              {!lane.items.length && (
                <div className="rounded-lg border border-dashed border-line-2 px-2 py-6 text-center">
                  <p className="text-[10.5px] text-ink-faint">Drop items here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}

/* ============================================================================
   CALENDAR — month grid with drag & drop scheduling
   ========================================================================== */
function CalendarView({ rows, onNavigate }: { rows: ReturnType<typeof scopeContent>; onNavigate: (id: string) => void }) {
  const ds = useDataset()
  const pushToast = useApp((s) => s.pushToast)
  const [monthOffset, setMonthOffset] = useState(0)
  const [dragged, setDragged] = useState<string | null>(null)
  const [moves, setMoves] = useState<Record<string, string>>({})
  const today = new Date(ds.todayKey + 'T00:00:00')

  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const firstWeekday = (monthDate.getDay() + 6) % 7
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const iso = (y: number, m: number, d: number) => `${y}-${`${m + 1}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`

  const byDay = useMemo(() => {
    const map = new Map<string, typeof rows>()
    for (const r of rows) {
      const key = moves[r.id] ?? r.publishDate ?? r.deadline
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  }, [rows, moves])

  const cells: (string | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => iso(monthDate.getFullYear(), monthDate.getMonth(), i + 1))]

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        icon={<CalendarDays />}
        title={monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        subtitle="Drag any card to reschedule · publishing days show a platform accent strip"
        actions={
          <>
            <Button size="xs" variant="ghost" onClick={() => setMonthOffset((m) => m - 1)}>
              ←
            </Button>
            <Button size="xs" variant="secondary" onClick={() => setMonthOffset(0)}>
              Today
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setMonthOffset((m) => m + 1)}>
              →
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-7 border-b border-line-2 bg-white/[0.014]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="px-2 py-1.5">
            <span className="cell-label">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const items = day ? (byDay.get(day) ?? []) : []
          const isToday = day === ds.todayKey
          const isPast = day !== null && day < ds.todayKey
          return (
            <div
              key={i}
              onDragOver={(e) => day && e.preventDefault()}
              onDrop={() => {
                if (!day || !dragged) return
                const item = rows.find((r) => r.id === dragged)
                setMoves((m) => ({ ...m, [dragged]: day }))
                pushToast({
                  kind: 'success',
                  title: `Rescheduled to ${fmtDate(day, 'long')}`,
                  body: item ? `“${item.title}” moved. Downstream derivatives shifted automatically.` : undefined,
                  action: { label: 'Undo', run: () => setMoves((m) => { const n = { ...m }; delete n[dragged]; return n }) },
                })
                setDragged(null)
              }}
              className={cn(
                'min-h-[112px] border-b border-r border-line-1 p-1.5 transition-colors duration-200',
                !day && 'bg-black/20',
                day && isPast && !isToday && 'opacity-55',
                isToday && 'bg-accent/[0.045]',
              )}
            >
              {day && (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn('mono text-[10px]', isToday ? 'font-semibold text-accent' : 'text-ink-faint')}>
                      {Number(day.slice(-2))}
                    </span>
                    {items.length > 2 && <span className="mono text-[9px] text-ink-ghost">+{items.length - 2}</span>}
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 2).map((item) => (
                      <button
                        key={item.id}
                        draggable
                        onDragStart={() => setDragged(item.id)}
                        onDragEnd={() => setDragged(null)}
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                          'group w-full overflow-hidden rounded-md border border-line-2 bg-surface-1 p-1.5 text-left transition-all duration-200',
                          'hover:border-line-3 hover:bg-surface-2',
                          dragged === item.id && 'opacity-40',
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-3 w-[2px] shrink-0 rounded-full" style={{ background: platformById(item.platforms[0]).color }} />
                          <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-ink-hi">{item.title}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 pl-[7px]">
                          <StatusPill name={statusById(item.status).name} color={statusById(item.status).accent} className="text-[8.5px]" />
                          <span className="mono truncate text-[8.5px] text-ink-faint">{contentTypeById(item.typeId).name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

/* ============================================================================
   TIMELINE — campaign and production gantt
   ========================================================================== */
function TimelineView({ rows, onNavigate }: { rows: ReturnType<typeof scopeContent>; onNavigate: (id: string) => void }) {
  const ds = useDataset()
  const today = new Date(ds.todayKey + 'T00:00:00')
  const [weeks, setWeeks] = useState(14)

  const items = rows
    .filter((r) => r.publishDate || r.deadline)
    .map((r) => {
      const end = r.publishDate ?? r.deadline!
      const start = r.createdAt
      return { item: r, start, end }
    })
    .sort((a, b) => a.end.localeCompare(b.end))

  const start = new Date(today)
  start.setDate(start.getDate() - 21)
  const end = new Date(today)
  end.setDate(end.getDate() + weeks * 7 - 21)
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000)

  const pct = (d: string) => {
    const days = (new Date(d + 'T00:00:00').getTime() - start.getTime()) / 86_400_000
    return Math.max(-2, Math.min(102, (days / totalDays) * 100))
  }

  const todayPct = pct(ds.todayKey)

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        icon={<GanttChartSquare />}
        title="Timeline"
        subtitle="Creative window per piece — from creation to publish"
        actions={
          <Segmented
            size="xs"
            value={String(weeks) as '10' | '14' | '20'}
            onChange={(v) => setWeeks(Number(v))}
            options={[
              { id: '10', label: '10w' },
              { id: '14', label: '14w' },
              { id: '20', label: '20w' },
            ]}
          />
        }
      />
      <div className="scroll-fade-x overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="relative flex border-b border-line-2 bg-white/[0.014]">
            <div className="w-[280px] shrink-0 px-3 py-1.5">
              <span className="cell-label">Content</span>
            </div>
            <div className="relative flex flex-1">
              {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => {
                const d = new Date(start)
                d.setDate(d.getDate() + i * 7)
                return (
                  <div key={i} className="flex-1 border-l border-line-1 px-1.5 py-1.5">
                    <span className="mono text-[9px] text-ink-faint">{fmtDate(isoLocal(d), 'short')}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-accent/45" style={{ left: `calc(280px + ${todayPct}% * (100% - 280px) / 100%)` }} aria-hidden />
            {items.map(({ item, start: s, end: e }) => {
              const left = pct(s)
              const right = pct(e)
              const width = Math.max(1.6, right - left)
              const status = statusById(item.status)
              const late = item.deadline && item.deadline < ds.todayKey && !['published', 'archived'].includes(item.status)
              return (
                <div key={item.id} className="flex items-center border-b border-line-1 transition-colors hover:bg-white/[0.02]">
                  <button onClick={() => onNavigate(item.id)} className="w-[280px] shrink-0 px-3 py-2 text-left">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(item.platforms[0]).color }} />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{item.title}</span>
                    </span>
                  </button>
                  <div className="relative h-9 flex-1">
                    <button
                      onClick={() => onNavigate(item.id)}
                      className="group absolute top-1/2 h-[16px] -translate-y-1/2 overflow-hidden rounded-[4px] transition-all duration-300 hover:h-[20px]"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${status.accent}55, ${status.accent}22)`,
                        border: `1px solid ${late ? '#FB718588' : `${status.accent}66`}`,
                      }}
                      title={`${item.title} — ${fmtDate(s, 'short')} → ${fmtDate(e, 'short')}`}
                    >
                      <span className="absolute inset-y-0 left-0 w-[2px]" style={{ background: status.accent }} />
                    </button>
                    {item.publishDate && (
                      <span
                        className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-base"
                        style={{ left: `${pct(item.publishDate)}%`, background: status.accent, boxShadow: `0 0 8px ${status.accent}` }}
                        title={`Publish ${fmtDate(item.publishDate, 'long')}`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-line-2 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          <span className="h-2 w-2 rounded-full bg-accent" /> publish date
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          <span className="h-[3px] w-6 rounded-full bg-accent/50" /> creative window
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          <span className="h-3 w-px bg-accent/60" /> today
        </span>
        <span className="mono ml-auto text-[10px] text-ink-ghost">{items.length} scheduled pieces</span>
      </div>
    </Panel>
  )
}

/* ============================================================================
   GALLERY
   ========================================================================== */
function GalleryView({
  rows,
  perfById,
  onNavigate,
}: {
  rows: ReturnType<typeof scopeContent>
  perfById: Map<string, ContentRow>
  onNavigate: (id: string) => void
}) {
  return (
    <div className="stagger grid gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {rows.map((item) => {
        const perf = perfById.get(item.id)
        const done = item.checklist.filter((c) => c.done).length
        return (
          <article
            key={item.id}
            className="group cursor-pointer overflow-hidden rounded-xl border border-line-2 bg-panel transition-all duration-250 hover:-translate-y-0.5 hover:border-line-3 hover:shadow-[0_20px_44px_-22px_rgba(0,0,0,0.95)]"
            onClick={() => onNavigate(item.id)}
          >
            <div className="relative">
              <Thumb seed={item.thumbnailSeed} accent={platformById(item.platforms[0]).color} title={item.title} aspect="16/9" />
              <div className="absolute left-2 top-2 flex items-center gap-1">
                {item.platforms.map((p) => (
                  <span
                    key={p}
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-md"
                    style={{ background: `${platformById(p).color}CC`, color: '#0B0D11' }}
                  >
                    {platformById(p).short}
                  </span>
                ))}
              </div>
              <div className="absolute right-2 top-2">
                <span className="rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-md">
                  <StatusPill name={statusById(item.status).name} color={statusById(item.status).accent} className="text-[9px]" />
                </span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink-hi">{item.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-faint">
                <span className="mono">{item.code}</span>
                <span>·</span>
                <span>{contentTypeById(item.typeId).name}</span>
                {item.publishDate && (
                  <>
                    <span>·</span>
                    <span className="mono">{fmtDate(item.publishDate, 'short')}</span>
                  </>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <Progress value={done} max={item.checklist.length} size="xs" />
                <span className="mono shrink-0 text-[9.5px] text-ink-faint">
                  {done}/{item.checklist.length}
                </span>
              </div>
              {perf ? (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-1 pt-2.5">
                  <div>
                    <p className="cell-label">Views</p>
                    <p className="tnum mt-0.5 text-[12px] text-ink-hi">{fmtNumber(perf.views, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="cell-label">Eng.</p>
                    <p className="tnum mt-0.5 text-[12px] text-ink-hi">{perf.engagementRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="cell-label">Follows</p>
                    <p className="tnum mt-0.5 text-[12px] text-emerald">+{fmtNumber(perf.followersGained, { compact: true })}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 border-t border-line-1 pt-2.5">
                  <p className="text-[10.5px] text-ink-faint">Not published — performance will appear here</p>
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

/* ============================================================================
   TOOLBAR PIECES
   ========================================================================== */
function StatusQuickFilter({ counts }: { counts: Map<string, number> }) {
  const filters = useApp((s) => s.filters)
  const setFilterList = useApp((s) => s.setFilterList)
  const groups = [
    { id: 'in-flight', label: 'In flight', statuses: ['production', 'editing', 'review', 'ready'] },
    { id: 'drafting', label: 'Drafting', statuses: ['idea', 'research', 'brief', 'scripting'] },
    { id: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
    { id: 'published', label: 'Published', statuses: ['published'] },
  ]
  return (
    <div className="hidden items-center gap-1 xl:flex" role="group" aria-label="Quick status filter">
      {groups.map((g) => {
        const active = g.statuses.every((s) => filters.statuses.includes(s)) && filters.statuses.length === g.statuses.length
        const count = g.statuses.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0)
        return (
          <button
            key={g.id}
            onClick={() => setFilterList('statuses', active ? [] : g.statuses)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-all duration-200',
              active ? 'border-accent/35 bg-accent/[0.1] text-accent-ink' : 'border-line-2 text-ink-mid hover:border-line-3 hover:text-ink',
            )}
          >
            {g.label}
            <span className="mono text-[9.5px] text-ink-faint">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

function GroupByMenu() {
  const [group, setGroup] = useState('status')
  return (
    <Popover
      align="end"
      width={220}
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-line-2 px-2 text-[11px] text-ink-mid transition-colors hover:border-line-3 hover:text-ink"
        >
          <Filter className="h-3 w-3" />
          <span className="hidden sm:inline">Group: {group}</span>
        </button>
      )}
    >
      <div className="p-1">
        {['status', 'platform', 'topic', 'content type', 'series', 'campaign', 'priority'].map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors',
              group === g ? 'bg-accent/[0.1] text-accent-ink' : 'text-ink hover:bg-white/[0.05]',
            )}
          >
            {g}
          </button>
        ))}
      </div>
    </Popover>
  )
}

function DatabaseSkeleton() {
  return (
    <Page width="full" className="px-4 py-5 lg:px-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-3 h-4 w-[440px]" />
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24" />
        ))}
      </div>
      <Skeleton className="mt-3 h-[520px] rounded-xl" />
    </Page>
  )
}

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}
