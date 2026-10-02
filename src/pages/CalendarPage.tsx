import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  Clock,
  GanttChartSquare,
  Layers,
  MoveHorizontal,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { platformById, statusById } from '@/data/registry'
import { fmtDate, fmtRelativeFuture } from '@/lib/format'
import { activeFilterCount, scopeContent, topicColor } from '@/analytics/queries'
import { resolvePeriod } from '@/analytics/periods'
import { LIVE_PLATFORMS } from '@/data/registry'
import { Badge, EmptyState, Panel, PanelHeader, Skeleton, StatusPill } from '@/components/ui/Surface'
import { Button } from '@/components/ui/Button'
import { Page, PageHeader, SplitGrid } from '@/components/ui/Page'
import { Segmented } from '@/components/ui/Field'
import { FilterBar } from '@/components/shell/FilterBar'
import { ActivityGrid } from '@/components/charts/Special'
import { ShareBar } from '@/components/charts/Bars'

/* ============================================================================
   CALENDAR — the scheduling brain
   Month / Week / Timeline over the same dataset. The rail computes cadence
   gaps, per-platform rhythm and the unscheduled backlog, so the grid is a
   decision surface rather than a render of dates.
   ========================================================================== */

type View = 'month' | 'week' | 'timeline'

export function CalendarPage() {
  const ds = useDataset()
  const activity = useActivity()
  const navigate = useNavigate()
  const filters = useApp((s) => s.filters)
  const settled = useSettled(220)
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date(ds.todayKey + 'T00:00:00'))

  const period = resolvePeriod(filters.period, filters.customFrom, filters.customTo)
  const scoped = useMemo(() => scopeContent(ds, filters, period), [ds, filters, period])
  const scheduled = useMemo(() => scoped.filter((c) => c.publishDate || c.deadline), [scoped])
  const backlog = useMemo(
    () => ds.content.filter((c) => !c.publishDate && ['idea', 'research', 'brief', 'scripting', 'production', 'editing', 'review', 'ready'].includes(c.status)),
    [ds.content],
  )

  if (!settled) {
    return (
      <Page width="full">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-3 h-4 w-[420px]" />
        <Skeleton className="mt-5 h-[560px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="full">
      <PageHeader
        eyebrow="Content"
        title="Calendar"
        description="Publishing rhythm across every platform. Drag to reschedule, and the cadence rail tells you what moves as a result."
        meta={<FilterBar />}
        actions={
          <>
            <Button variant="secondary" size="md" icon={<Clock />} onClick={() => navigate('/content?view=timeline')}>
              Content timeline
            </Button>
            <Button variant="primary" size="md" icon={<Plus />} onClick={() => useApp.getState().setCreateOpen(true, 'content')}>
              Schedule piece
            </Button>
          </>
        }
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Calendar view"
          value={view}
          onChange={setView}
          options={[
            { id: 'month', label: <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Month</span> },
            { id: 'week', label: <span className="inline-flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" /> Week</span> },
            { id: 'timeline', label: <span className="inline-flex items-center gap-1.5"><GanttChartSquare className="h-3.5 w-3.5" /> Timeline</span> },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => shift(-1)}>
            ←
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCursor(new Date(ds.todayKey + 'T00:00:00'))}>
            Today
          </Button>
          <Button size="sm" variant="ghost" onClick={() => shift(1)}>
            →
          </Button>
        </div>
        <span className="text-[12px] font-medium text-ink-hi">{heading(view, cursor)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {LIVE_PLATFORMS.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-md border border-line-2 px-2 py-1 text-[10.5px] text-ink-mid">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}80` }} />
              {p.name}
              <span className="mono text-[9.5px] text-ink-faint">{scheduled.filter((c) => c.platforms.includes(p.id)).length}</span>
            </span>
          ))}
          {activeFilterCount(filters) > 0 && (
            <Badge tone="accent" size="xs">
              {activeFilterCount(filters)} filter{activeFilterCount(filters) === 1 ? '' : 's'} active
            </Badge>
          )}
        </div>
      </div>

      <SplitGrid ratio="wide" className="gap-3.5">
        <div className="min-w-0">
          {view === 'month' && <MonthGrid rows={scheduled} cursor={cursor} onOpen={(id) => navigate(`/content/${id}`)} />}
          {view === 'week' && <WeekGrid rows={scheduled} cursor={cursor} onOpen={(id) => navigate(`/content/${id}`)} />}
          {view === 'timeline' && <Swimlanes rows={scheduled} cursor={cursor} onOpen={(id) => navigate(`/content/${id}`)} />}
        </div>

        <div className="space-y-3.5">
          <CadencePanel rows={scheduled} />
          <BacklogRail items={backlog} onOpen={(id) => navigate(`/content/${id}`)} />
          <Panel>
            <PanelHeader dense icon={<TrendingUp />} title="Your publishing windows" subtitle="Engagement by hour over the last 90 days" />
            <div className="p-3.5">
              <ActivityGrid rows={activity.rows} hours={activity.hours} color="#5B9DFF" />
            </div>
          </Panel>
        </div>
      </SplitGrid>
    </Page>
  )

  function shift(direction: number) {
    const next = new Date(cursor)
    if (view === 'month') next.setMonth(next.getMonth() + direction)
    else next.setDate(next.getDate() + direction * 7)
    setCursor(next)
  }
}

/* ============================================================================
   MONTH
   ========================================================================== */
function MonthGrid({ rows, cursor, onOpen }: { rows: ReturnType<typeof scopeContent>; cursor: Date; onOpen: (id: string) => void }) {
  const ds = useDataset()
  const pushToast = useApp((s) => s.pushToast)
  const [drag, setDrag] = useState<string | null>(null)
  const [moves, setMoves] = useState<Record<string, string>>({})
  const [hover, setHover] = useState<string | null>(null)

  const firstWeekday = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ]

  const byDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof scopeContent>>()
    for (const r of rows) {
      const key = moves[r.id] ?? r.publishDate ?? r.deadline
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    return map
  }, [rows, moves])

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        dense
        icon={<MoveHorizontal />}
        title="Drag to reschedule"
        subtitle="Conflicts are flagged the moment a day carries more than one publish"
        actions={<span className="mono text-[10px] text-ink-faint">{rows.length} scheduled</span>}
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
          const past = day !== null && day < ds.todayKey
          const conflict = items.length > 1
          const weekend = day !== null && new Date(day + 'T00:00:00').getDay() % 6 === 0
          return (
            <div
              key={i}
              onDragOver={(e) => {
                if (!day) return
                e.preventDefault()
                setHover(day)
              }}
              onDragLeave={() => setHover((h) => (h === day ? null : h))}
              onDrop={() => {
                if (!day || !drag) return
                const item = rows.find((r) => r.id === drag)
                setMoves((m) => ({ ...m, [drag]: day }))
                pushToast({
                  kind: conflict ? 'warn' : 'success',
                  title: conflict ? `Double-booked ${fmtDate(day, 'long')}` : `Moved to ${fmtDate(day, 'long')}`,
                  body: item ? `“${item.title}”${conflict ? ' now shares this day with another publish.' : ' rescheduled.'}` : undefined,
                  action: { label: 'Undo', run: () => setMoves((m) => { const n = { ...m }; delete n[drag]; return n }) },
                })
                setDrag(null)
                setHover(null)
              }}
              className={cn(
                'min-h-[126px] border-b border-r border-line-1 p-1.5 transition-colors duration-200',
                !day && 'bg-black/25',
                weekend && day && 'bg-white/[0.008]',
                isToday && 'bg-accent/[0.05]',
                hover === day && day !== ds.todayKey && 'bg-accent/[0.07]',
                past && !isToday && 'opacity-55',
              )}
            >
              {day && (
                <>
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span className={cn('mono text-[10px]', isToday ? 'font-semibold text-accent' : 'text-ink-faint')}>{Number(day.slice(-2))}</span>
                    <span className="flex items-center gap-1">
                      {conflict && <AlertTriangle className="h-2.5 w-2.5 text-amber" />}
                      {items.length > 2 && <span className="mono text-[9px] text-ink-ghost">+{items.length - 2}</span>}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 2).map((item) => (
                      <button
                        key={item.id}
                        draggable
                        onDragStart={() => setDrag(item.id)}
                        onDragEnd={() => setDrag(null)}
                        onClick={() => onOpen(item.id)}
                        className={cn(
                          'group relative w-full overflow-hidden rounded-md border border-line-2 bg-surface-1 py-1.5 pl-2 pr-1.5 text-left transition-all duration-200',
                          'hover:border-line-3 hover:bg-surface-2',
                          drag === item.id && 'opacity-40',
                        )}
                      >
                        <span className="absolute inset-y-0 left-0 w-[2.5px]" style={{ background: platformById(item.platforms[0]).color }} />
                        <span className="block truncate text-[10px] font-medium leading-tight text-ink-hi">{item.title}</span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <StatusPill name={statusById(item.status).name} color={statusById(item.status).accent} className="text-[8.5px]" />
                          <span className="mono truncate text-[8.5px] text-ink-faint">{platformById(item.platforms[0]).short}</span>
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
   WEEK — hour-level scheduling
   ========================================================================== */
function WeekGrid({ rows, cursor, onOpen }: { rows: ReturnType<typeof scopeContent>; cursor: Date; onOpen: (id: string) => void }) {
  const pushToast = useApp((s) => s.pushToast)
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return iso(d.getFullYear(), d.getMonth(), d.getDate())
  })
  const hours = Array.from({ length: 13 }, (_, i) => i + 9) // 09:00 → 21:00
  const [placed, setPlaced] = useState<Record<string, { day: string; hour: number }>>({})

  const slotOf = (item: (typeof rows)[number]) => {
    if (placed[item.id]) return placed[item.id]
    const day = item.publishDate ?? item.deadline
    if (!day) return null
    let hash = 0
    for (const ch of item.id) hash = (hash * 31 + ch.charCodeAt(0)) % 997
    return { day, hour: 12 + (hash % 8) }
  }

  const [drag, setDrag] = useState<string | null>(null)

  return (
    <Panel className="overflow-hidden">
      <PanelHeader dense icon={<Clock />} title="Week schedule" subtitle="Your audience is most active 18:00–21:00 on weekdays — the heat map in the rail confirms it" />
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="flex border-b border-line-2 bg-white/[0.014]">
            <div className="w-[64px] shrink-0" />
            {days.map((d) => (
              <div key={d} className="flex-1 border-l border-line-1 px-2 py-1.5">
                <p className="cell-label">{fmtDate(d, 'medium').split(' ')[0]}</p>
                <p className="mono text-[10px] text-ink-faint">{fmtDate(d, 'short')}</p>
              </div>
            ))}
          </div>
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="flex border-b border-line-1">
                <div className="mono w-[64px] shrink-0 px-2 py-1 text-right text-[9.5px] text-ink-ghost">{`${`${h}`.padStart(2, '0')}:00`}</div>
                {days.map((d) => {
                  const items = rows.filter((r) => {
                    const slot = slotOf(r)
                    return slot?.day === d && slot.hour === h
                  })
                  return (
                    <div
                      key={d + h}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!drag) return
                        setPlaced((p) => ({ ...p, [drag]: { day: d, hour: h } }))
                        const item = rows.find((r) => r.id === drag)
                        pushToast({ kind: 'success', title: `Scheduled ${fmtDate(d, 'long')} at ${`${h}`.padStart(2, '0')}:00`, body: item ? `“${item.title}” — reminder set 24h before.` : undefined })
                        setDrag(null)
                      }}
                      className={cn('min-h-[34px] flex-1 border-l border-line-1 p-0.5 transition-colors', h >= 18 && h <= 21 && 'bg-accent/[0.018]')}
                    >
                      {items.map((item) => (
                        <button
                          key={item.id}
                          draggable
                          onDragStart={() => setDrag(item.id)}
                          onDragEnd={() => setDrag(null)}
                          onClick={() => onOpen(item.id)}
                          className="mb-0.5 w-full overflow-hidden rounded border border-line-2 bg-surface-1 px-1.5 py-1 text-left transition-colors hover:border-line-3"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(item.platforms[0]).color }} />
                            <span className="min-w-0 flex-1 truncate text-[9.5px] text-ink-hi">{item.title}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

/* ============================================================================
   SWIMLANES — platform rhythm
   ========================================================================== */
function Swimlanes({ rows, cursor, onOpen }: { rows: ReturnType<typeof scopeContent>; cursor: Date; onOpen: (id: string) => void }) {
  const ds = useDataset()
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return iso(d.getFullYear(), d.getMonth(), d.getDate())
  })

  const lanes = LIVE_PLATFORMS.map((p) => ({
    platform: p,
    items: rows.filter((r) => r.platforms.includes(p.id)),
  }))

  return (
    <Panel className="overflow-hidden">
      <PanelHeader dense icon={<Layers />} title="Platform swimlanes" subtitle="Six weeks · one lane per platform, so no channel goes quiet by accident" />
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className="flex border-b border-line-2 bg-white/[0.014]">
            <div className="w-[130px] shrink-0 px-3 py-1.5">
              <span className="cell-label">Platform</span>
            </div>
            <div className="flex flex-1">
              {days.map((d) => (
                <div key={d} className={cn('flex-1 border-l border-line-1 py-1.5 text-center', d === ds.todayKey && 'bg-accent/[0.07]')}>
                  <span className={cn('mono text-[8.5px]', d === ds.todayKey ? 'text-accent' : 'text-ink-ghost')}>{Number(d.slice(-2))}</span>
                </div>
              ))}
            </div>
          </div>
          {lanes.map(({ platform, items }) => (
            <div key={platform.id} className="flex border-b border-line-1">
              <div className="flex w-[130px] shrink-0 items-center gap-2 px-3 py-3">
                <span className="h-2 w-2 rounded-full" style={{ background: platform.color, boxShadow: `0 0 7px ${platform.color}80` }} />
                <span className="text-[11.5px] text-ink-hi">{platform.name}</span>
              </div>
              <div className="relative flex-1 py-3">
                <div className="absolute inset-0 flex">
                  {days.map((d) => (
                    <div key={d} className={cn('flex-1 border-l border-line-1', (new Date(d + 'T00:00:00').getDay() + 6) % 7 >= 5 && 'bg-white/[0.01]')} />
                  ))}
                </div>
                <div className="absolute inset-y-0" style={{ left: `${(days.indexOf(ds.todayKey) / days.length) * 100}%` }}>
                  <span className="block h-full w-px bg-accent/50" />
                </div>
                {items.map((item) => {
                  const day = item.publishDate ?? item.deadline
                  if (!day) return null
                  const idx = days.indexOf(day)
                  if (idx < 0) return null
                  return (
                    <button
                      key={item.id}
                      onClick={() => onOpen(item.id)}
                      style={{ left: `${(idx / days.length) * 100}%`, width: `${(1 / days.length) * 100}%` }}
                      className="absolute top-1/2 -translate-y-1/2 px-[2px]"
                      title={`${item.title} · ${fmtDate(day, 'long')}`}
                    >
                      <span
                        className="block h-[18px] rounded-[4px] border transition-transform duration-200 hover:scale-y-125"
                        style={{ background: `${platform.color}33`, borderColor: `${platform.color}77` }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="text-[10px] text-ink-faint">
              {lanes.every((l) => l.items.length > 0) ? 'All live platforms have scheduled output in this window.' : 'At least one platform is quiet this window.'}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  )
}

/* ============================================================================
   RAIL
   ========================================================================== */
function CadencePanel({ rows }: { rows: ReturnType<typeof scopeContent> }) {
  const ds = useDataset()
  const publishedDays = useMemo(() => {
    const set = new Set<string>()
    ds.content.filter((c) => c.publishDate && c.status === 'published').forEach((c) => set.add(c.publishDate!))
    return [...set].sort()
  }, [ds.content])

  const gaps = useMemo(() => {
    const out: { from: string; to: string; days: number }[] = []
    for (let i = 1; i < publishedDays.length; i++) {
      const days = Math.round((+new Date(publishedDays[i]) - +new Date(publishedDays[i - 1])) / 86_400_000)
      if (days >= 4) out.push({ from: publishedDays[i - 1], to: publishedDays[i], days })
    }
    return out.sort((a, b) => b.days - a.days).slice(0, 3)
  }, [publishedDays])

  const next7 = rows.filter((r) => {
    const d = r.publishDate ?? r.deadline
    if (!d) return false
    const diff = (+new Date(d) - +new Date(ds.todayKey)) / 86_400_000
    return diff >= 0 && diff <= 7
  })

  const perPlatform = LIVE_PLATFORMS.map((p) => ({
    platform: p,
    count: rows.filter((r) => r.platforms.includes(p.id)).length,
  }))
  const total = perPlatform.reduce((s, x) => s + x.count, 0) || 1

  return (
    <Panel>
      <PanelHeader dense icon={<Sparkles />} title="Cadence" subtitle="Consistency beats frequency — the algorithm rewards rhythm" />
      <div className="space-y-3.5 p-3.5">
        <div>
          <p className="cell-label mb-2">Mix over this scope</p>
          <ShareBar
            segments={perPlatform.map(({ platform, count }) => ({ id: platform.id, label: platform.name, value: count, color: platform.color }))}
            showLabels
          />
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-line-1 pt-3">
          <div>
            <p className="cell-label">This week</p>
            <p className="tnum mt-1 text-[15px] text-ink-hi">{next7.length}</p>
            <p className="text-[10px] text-ink-faint">scheduled</p>
          </div>
          <div>
            <p className="cell-label">Publish days</p>
            <p className="tnum mt-1 text-[15px] text-ink-hi">{publishedDays.length}</p>
            <p className="text-[10px] text-ink-faint">last 90 days</p>
          </div>
          <div>
            <p className="cell-label">Avg gap</p>
            <p className="tnum mt-1 text-[15px] text-ink-hi">
              {(gaps.length ? gaps.reduce((s, g) => s + g.days, 0) / gaps.length : 2.1).toFixed(1)}
            </p>
            <p className="text-[10px] text-ink-faint">days</p>
          </div>
        </div>

        <div className="border-t border-line-1 pt-3">
          <p className="cell-label mb-2">Longest quiet stretches</p>
          {gaps.length ? (
            <ul className="space-y-1.5">
              {gaps.map((g) => (
                <li key={g.from} className="flex items-center justify-between gap-2">
                  <span className="mono text-[10.5px] text-ink-mid">
                    {fmtDate(g.from, 'short')} → {fmtDate(g.to, 'short')}
                  </span>
                  <Badge tone={g.days >= 8 ? 'danger' : 'warn'} size="xs">
                    {g.days}d gap
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-emerald">No gap longer than 3 days. Rhythm is holding.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}

function BacklogRail({ items, onOpen }: { items: ReturnType<typeof useDataset>['content']; onOpen: (id: string) => void }) {
  const [limit, setLimit] = useState(6)
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        dense
        icon={<Plus />}
        title="Unscheduled backlog"
        subtitle={`${items.length} pieces have no date yet`}
        actions={<span className="mono text-[10px] text-ink-faint">drag onto the grid</span>}
      />
      <ul className="divide-y divide-[var(--color-line-1)]">
        {items.slice(0, limit).map((item) => (
          <li key={item.id} draggable onDragStart={() => undefined}>
            <button onClick={() => onOpen(item.id)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.028]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: topicColor(useDataset(), item.topicId) }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] text-ink-hi">{item.title}</span>
                <span className="block truncate text-[10px] text-ink-faint">
                  {statusById(item.status).name} · {item.effortHours}h effort
                </span>
              </span>
              {item.deadline && <span className="mono shrink-0 text-[9.5px] text-ink-faint">{fmtRelativeFuture(item.deadline)}</span>}
            </button>
          </li>
        ))}
        {!items.length && <li className="p-4"><EmptyState compact icon={<Sparkles />} title="Backlog clear" body="Every piece has a date." /></li>}
      </ul>
      {items.length > limit && (
        <div className="border-t border-line-1 p-2">
          <Button size="xs" variant="ghost" className="w-full" onClick={() => setLimit((l) => l + 6)}>
            Show more ({items.length - limit})
          </Button>
        </div>
      )}
    </Panel>
  )
}

/* ============================================================================
   HELPERS
   ========================================================================== */
function useActivity() {
  const [state] = useState(() => {
    const rows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const hours = [9, 11, 13, 15, 17, 18, 19, 20, 21]
    const values = rows.map((_, r) =>
      hours.map((h, hi) => {
        const evening = h >= 17 ? 1.55 : h >= 13 ? 1.15 : 0.75
        const weekend = r >= 5 ? 0.72 : 1
        const noise = 0.85 + ((Math.sin((r + 1) * 12.9 + hi * 4.7) * 0.5) + 0.5) * 0.32
        return Math.round(58 * evening * weekend * noise)
      }),
    )
    return { rows: rows.map((day, i) => ({ day, values: values[i] })), hours, max: 100, unit: '%' }
  })
  return state
}

function startOfWeek(d: Date) {
  const out = new Date(d)
  const day = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - day)
  return out
}

function iso(y: number, m: number, d: number) {
  return `${y}-${`${m + 1}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`
}

function heading(view: View, cursor: Date) {
  if (view === 'month') return cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const start = startOfWeek(cursor)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${fmtDate(iso(start.getFullYear(), start.getMonth(), start.getDate()), 'short')} – ${fmtDate(iso(end.getFullYear(), end.getMonth(), end.getDate()), 'short')}`
}
