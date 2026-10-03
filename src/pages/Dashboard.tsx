import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Gauge as GaugeIcon,
  GitBranch,
  Heart,
  Layers,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { platformById, statusById, CONTENT_TYPES } from '@/data/registry'
import { fmtDate, fmtDuration, fmtNumber, fmtRelativeFuture, fmtSignedPercent, relativeDays } from '@/lib/format'
import {
  aggregate,
  calendarHeatmap,
  contentRows,
  creatorHealth,
  isContentScoped,
  pipelineStats,
  platformBreakdown,
  samplesIn,
  scopeContent,
  scopedTotals,
  topicStats,
  type ContentRow,
} from '@/analytics/queries'
import { resolvePeriod } from '@/analytics/periods'
import { PIPELINE_STAGES } from '@/data/registry'
import type { ChartRow } from '@/analytics/queries'
import { MetricTrend, Sparkline } from '@/components/charts/LineArea'
import { MetricBars, RankedBars, ShareBar } from '@/components/charts/Bars'
import { CalendarHeat, Gauge } from '@/components/charts/Special'
import { ChartPanel, chartData } from '@/components/charts/kit'
import { MetricCard, MetricHero, PulseChip } from '@/components/metrics/MetricCard'
import { FilterBar } from '@/components/shell/FilterBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge, Delta, EmptyState, Panel, PanelHeader, Progress, Ring, SectionHeader, Skeleton, StatusPill } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, SplitGrid } from '@/components/ui/Page'
import { Segmented } from '@/components/ui/Field'
import { Tooltip } from '@/components/ui/Tooltip'
import { useSettled } from '@/lib/hooks'

/* ============================================================================
   DASHBOARD
   The five-second screen. Answers, in order:
     1. What is happening right now?         → pulse strip + hero trend
     2. What is stuck?                       → pipeline + today rail
     3. Is it working?                       → platform breakdown + health
     4. What should I do next?               → deadlines, signals, top content
   ========================================================================== */

type TrendMetric = 'views' | 'reach' | 'engagements' | 'followersGained' | 'watchMinutes'

const TREND_METRICS: { id: TrendMetric; label: string; color: string }[] = [
  { id: 'views', label: 'Views', color: '#5B9DFF' },
  { id: 'reach', label: 'Reach', color: '#38D6F5' },
  { id: 'engagements', label: 'Engagement', color: '#A78BFA' },
  { id: 'followersGained', label: 'Followers', color: '#34D399' },
  { id: 'watchMinutes', label: 'Watch time', color: '#7C5CF5' },
]

type TrendMode = 'area' | 'stacked' | 'line'

export function Dashboard() {
  const ds = useDataset()
  const navigate = useNavigate()
  const filters = useApp((s) => s.filters)
  const openPanel = useApp((s) => s.openPanel)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const settled = useSettled(300)

  const [trendMetrics, setTrendMetrics] = useState<TrendMetric[]>(['views', 'reach'])
  const [trendMode, setTrendMode] = useState<TrendMode>('area')
  const [compare, setCompare] = useState<'none' | 'previous' | 'year'>('previous')
  const [pulseFocus, setPulseFocus] = useState<string | null>(null)

  const period = resolvePeriod(filters.period, filters.customFrom, filters.customTo)
  const { totals, previous, year } = useMemo(() => scopedTotals(ds, filters), [ds, filters])
  const scoped = isContentScoped(filters)

  /* --- sparkline source: daily, unfiltered by taxonomy so it always renders */
  const daily = useMemo(() => {
    const samples = samplesIn(ds, period, filters.platforms)
    const byDay = new Map<string, { views: number; reach: number; engagements: number; watchMinutes: number; followersGained: number; revenue: number }>()
    for (const s of samples) {
      const cur = byDay.get(s.date) ?? { views: 0, reach: 0, engagements: 0, watchMinutes: 0, followersGained: 0, revenue: 0 }
      cur.views += s.views
      cur.reach += s.reach
      cur.engagements += s.engagements
      cur.watchMinutes += s.watchMinutes
      cur.followersGained += s.followersGained
      cur.revenue += s.revenue
      byDay.set(s.date, cur)
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }))
  }, [ds, period, filters.platforms])

  const chartRows = useMemo(
    () =>
      daily.map((d) => ({
        ...d,
        label: fmtDate(d.date, 'short'),
        engagementRate: d.reach ? (d.engagements / d.reach) * 100 : 0,
        followers: 0,
        impressions: 0,
        clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      })),
    [daily],
  )

  const compareRows = useMemo<ChartRow[]>(() => {
    if (compare === 'none') return chartRows
    const prevFrom = compare === 'previous' ? period.prevFrom : period.yearFrom
    const prevTo = compare === 'previous' ? period.prevTo : period.yearTo
    const prev = aggregate(
      ds.metrics.filter((m) => m.date >= prevFrom && m.date <= prevTo && (!filters.platforms.length || filters.platforms.includes(m.platform))),
      ds,
    )
    /* Build a same-length comparison series from the previous window's days. */
    const prevDays = ds.metrics.filter((m) => m.date >= prevFrom && m.date <= prevTo)
    const byDay = new Map<string, number>()
    for (const m of prevDays) byDay.set(m.date, (byDay.get(m.date) ?? 0) + m.views)
    const values = [...byDay.values()]
    return chartRows.map((r, i) => ({ ...r, prevViews: values[i] ?? Math.round(prev.views / Math.max(1, chartRows.length)) }))
  }, [chartRows, compare, ds, period, filters.platforms])

  const platforms = useMemo(() => platformBreakdown(ds, filters), [ds, filters])
  const pipeline = useMemo(() => pipelineStats(ds, PIPELINE_STAGES), [ds])
  const health = useMemo(() => creatorHealth(ds, filters), [ds, filters])
  const topics = useMemo(() => topicStats(ds, filters, { topLevelOnly: true }).slice(0, 5), [ds, filters])
  const perfRows = useMemo(() => contentRows(ds, filters).slice(0, 7), [ds, filters])
  const heat = useMemo(() => calendarHeatmap(ds, filters, 22), [ds, filters])

  /* --- the series behind the pulse chart, exposed as a table on demand ---- */
  const trendSource = useMemo(
    () => (compare === 'none' ? chartRows : compare === 'year' ? compareRows.map((r) => ({ ...r, yearViews: r.prevViews })) : compareRows),
    [chartRows, compareRows, compare],
  )

  const trendData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Date' },
          ...trendMetrics.map((m) => ({
            key: m,
            label: TREND_METRICS.find((x) => x.id === m)!.label,
            align: 'right' as const,
            format: (v: number) => (m === 'watchMinutes' ? fmtDuration(v) : fmtNumber(v)),
          })),
        ],
        trendSource.map((r) => {
          const row: Record<string, string | number> = { label: r.label }
          for (const m of trendMetrics) row[m] = r[m]
          return row
        }),
        { unit: 'day', caption: `Daily metrics for the ${period.label} period` },
      ),
    [trendSource, trendMetrics, period.label],
  )

  const platformData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Platform' },
          { key: 'reach', label: 'Reach', align: 'right' },
          { key: 'followers', label: 'Followers', align: 'right' },
          { key: 'engagementRate', label: 'Eng. rate', align: 'right', format: (v: number) => `${v.toFixed(2)}%` },
          { key: 'publishedCount', label: 'Published', align: 'right' },
        ],
        platforms.map((p) => ({
          name: p.name,
          reach: p.reach,
          followers: p.followers,
          engagementRate: Number(p.engagementRate.toFixed(2)),
          publishedCount: p.publishedCount,
        })),
        { unit: 'platform', caption: 'Platform reach, audience and output for the selected period' },
      ),
    [platforms],
  )

  const heatData = useMemo(
    () =>
      chartData(
        [
          { key: 'date', label: 'Date' },
          { key: 'value', label: 'Impressions', align: 'right' },
          { key: 'published', label: 'Published', align: 'right' },
        ],
        heat.map((c) => ({ date: fmtDate(c.date, 'short'), value: c.value, published: c.published })),
        { unit: 'day', caption: 'Daily impressions and publishing activity over the last 22 weeks' },
      ),
    [heat],
  )

  const topicData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Topic' },
          { key: 'reach', label: 'Reach', align: 'right' },
          { key: 'pieces', label: 'Pieces', align: 'right' },
          { key: 'engagementRate', label: 'Eng. rate', align: 'right', format: (v: number) => `${v.toFixed(2)}%` },
        ],
        topics.map((t) => ({ name: t.name, reach: t.reach, pieces: t.pieces, engagementRate: Number(t.engagementRate.toFixed(2)) })),
        { unit: 'topic', caption: 'Topic momentum by reach in the selected period' },
      ),
    [topics],
  )

  const rhythm = useMemo(() => publishRhythm(ds), [ds])
  const rhythmData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Week of' },
          { key: 'youtube', label: 'YouTube', align: 'right' },
          { key: 'instagram', label: 'Instagram', align: 'right' },
          { key: 'linkedin', label: 'LinkedIn', align: 'right' },
        ],
        rhythm,
        { unit: 'week', caption: 'Pieces published per week by platform, last six weeks' },
      ),
    [rhythm],
  )

  /* Creator health is six rings; a table adds nothing, so it gets a spoken
     summary instead and keeps its rows semantic. */
  const healthSummary = useMemo(() => {
    const weakest = [...health].sort((a, b) => a.value - b.value)[0]
    return (
      `Creator health: ${health.length} signals, averaging ${Math.round(health.reduce((s, h) => s + h.value, 0) / Math.max(1, health.length))} out of 100.` +
      (weakest ? ` Weakest is ${weakest.label} at ${Math.round(weakest.value)} — ${weakest.detail}.` : '')
    )
  }, [health])


  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const deadlines = useMemo(() => {
    const items = scopeContent(ds, filters, period)
      .filter((c) => c.deadline && !['published', 'archived'].includes(c.status))
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    return items.slice(0, 5)
  }, [ds, filters, period])

  const overdue = deadlines.filter((c) => (relativeDays(c.deadline) ?? 0) < 0).length
  const followTotal = platforms.reduce((s, p) => s + p.followers, 0)

  if (!settled) return <DashboardSkeleton />

  return (
    <Page width="wide">
      {/* ==================================================================== */}
      {/* HEADER                                                               */}
      {/* ==================================================================== */}
      <PageHead
        greeting={greeting}
        name={ds.creator.name.split(' ')[0]}
        mission={ds.creator.mission}
        overdue={overdue}
        onNew={() => setCreateOpen(true, 'content')}
      />

      <FilterBar className="mb-4" showCustomRange />

      {/* ==================================================================== */}
      {/* PULSE STRIP — six metrics, one visual system                          */}
      {/* ==================================================================== */}
      <section aria-labelledby="pulse-heading" className="mb-4">
        <h2 id="pulse-heading" className="sr-only">
          Creator pulse
        </h2>
        <div className="stagger grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <MetricCard
            metricId="followers"
            value={totals.followers}
            delta={deltaOf(previous.followers, totals.followers)}
            spark={daily.map((d) => d.followersGained)}
            context={`${fmtNumber(totals.followersGained)} new`}
            icon={<Users />}
            onClick={() => navigate('/audience')}
            active={pulseFocus === 'followers'}
          />
          <MetricCard
            metricId="reach"
            value={totals.reach}
            delta={deltaOf(previous.reach, totals.reach)}
            spark={daily.map((d) => d.reach)}
            context="unique accounts"
            icon={<Radio />}
            active={pulseFocus === 'reach'}
            onClick={() => setPulseFocus(pulseFocus === 'reach' ? null : 'reach')}
          />
          <MetricCard
            metricId="views"
            value={totals.views}
            delta={deltaOf(previous.views, totals.views)}
            spark={daily.map((d) => d.views)}
            context={`${(totals.views / Math.max(1, period.days)).toFixed(0)}/day avg`}
            icon={<Eye />}
            active={pulseFocus === 'views'}
            onClick={() => setPulseFocus(pulseFocus === 'views' ? null : 'views')}
          />
          <MetricCard
            metricId="engagementRate"
            value={totals.engagementRate}
            delta={deltaOf(previous.engagementRate, totals.engagementRate)}
            spark={daily.map((d) => (d.reach ? (d.engagements / d.reach) * 100 : 0))}
            context={`${fmtNumber(totals.engagements)} engagements`}
            icon={<Activity />}
          />
          <MetricCard
            metricId="watchMinutes"
            value={totals.watchMinutes}
            delta={deltaOf(previous.watchMinutes, totals.watchMinutes)}
            spark={daily.map((d) => d.watchMinutes)}
            context="video surfaces"
            icon={<Clock />}
          />
          <MetricCard
            metricId="revenue"
            value={totals.revenue}
            delta={deltaOf(previous.revenue, totals.revenue)}
            context={`${period.days} days attributed`}
            icon={<Wallet />}
            onClick={() => navigate('/revenue')}
          />
          <MetricCard
            metricId="followersGained"
            value={totals.followersGained}
            delta={deltaOf(previous.followersGained, totals.followersGained)}
            spark={daily.map((d) => d.followersGained)}
            context="net of churn"
            icon={<TrendingUp />}
          />
        </div>
      </section>

      {/* ==================================================================== */}
      {/* CREATOR PULSE + RAIL                                                 */}
      {/* ==================================================================== */}
      <SplitGrid ratio="wide" gap="md" className="mb-4">
        <Panel glow={2} className="overflow-hidden">
          <div className="grid-etch">
            <PanelHeader
              dense
              icon={<GaugeIcon />}
              title="Creator pulse"
              subtitle={
                scoped
                  ? `${fmtNumber(totals.views)} views attributed to ${scopeContent(ds, filters, period).length} in-scope pieces`
                  : `${fmtNumber(totals.impressions)} impressions across ${platforms.length} platforms`
              }
              actions={
                <div className="flex items-center gap-1.5">
                  <Badge tone={compare === 'none' ? 'outline' : 'accent'} size="xs" mono>
                    {compare === 'none' ? 'no compare' : compare === 'previous' ? 'vs prev period' : 'vs last year'}
                  </Badge>
                  <Button size="xs" variant="ghost" iconRight={<ChevronRight />} onClick={() => navigate('/analytics')}>
                    Full analytics
                  </Button>
                </div>
              }
            />
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_284px]">
              <div className="min-w-0">
                <MetricHero
                  label="Total reach in period"
                  value={fmtNumber(totals.reach, { compact: totals.reach >= 100_000 })}
                  unit="unique accounts"
                  delta={deltaOf(previous.reach, totals.reach)}
                  spark={daily.map((d) => d.reach)}
                  color="#38D6F5"
                />
                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {TREND_METRICS.map((m) => {
                        const on = trendMetrics.includes(m.id)
                        return (
                          <button
                            key={m.id}
                            onClick={() =>
                              setTrendMetrics((list) => (list.includes(m.id) ? (list.length > 1 ? list.filter((x) => x !== m.id) : list) : [...list, m.id]))
                            }
                            aria-pressed={on}
                            className={cn(
                              'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[10.5px] font-medium transition-all duration-200',
                              on ? 'border-transparent text-ink-hi' : 'border-line-2 text-ink-low hover:border-line-3 hover:text-ink-mid',
                            )}
                            style={on ? { background: `${m.color}1C`, borderColor: `${m.color}55` } : undefined}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color, opacity: on ? 1 : 0.4 }} />
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                    <Segmented
                      ariaLabel="Chart style"
                      size="xs"
                      value={trendMode}
                      onChange={setTrendMode}
                      options={[
                        { id: 'area', label: 'Area' },
                        { id: 'stacked', label: 'Stack' },
                        { id: 'line', label: 'Line' },
                      ]}
                    />
                  </div>
                  <ChartPanel bare data={trendData} summary={`Creator pulse. ${narrative(totals, previous, platforms)}`}>
                    <MetricTrend
                      rows={trendSource}
                      series={trendMetrics.map((m) => ({ id: m, type: 'area' as const }))}
                      mode={trendMode === 'line' ? 'line' : trendMode === 'stacked' ? 'stacked' : 'area'}
                      compareKey={compare === 'none' ? undefined : compare === 'year' ? 'yearViews' : 'prevViews'}
                      compareLabel={compare === 'previous' ? 'Previous period' : compare === 'year' ? 'Same period last year' : undefined}
                      height={216}
                      onPointClick={() => navigate('/analytics')}
                    />
                  </ChartPanel>
                </div>
              </div>

              {/* --- pulse rail: the "is this normal?" column --------------- */}
              <div className="min-w-0 space-y-2.5 border-t border-line-1 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <p className="cell-label">Signal breakdown</p>
                {TREND_METRICS.slice(0, 5).map((m) => {
                  const cur = metricValue(totals, m.id)
                  const prev = metricValue(previous, m.id)
                  const yr = metricValue(year, m.id)
                  return (
                    <div key={m.id} className="rounded-lg border border-line-1 bg-white/[0.014] px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
                          <span className="text-[11px] text-ink-mid">{m.label}</span>
                        </span>
                        <span className="tnum text-[12px] font-semibold text-ink-hi">
                          {m.id === 'watchMinutes' ? fmtDuration(cur) : fmtNumber(cur, { compact: cur >= 100_000 })}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <Delta value={deltaOf(prev, cur)} size="xs" suffix="vs prev" />
                        <Delta value={deltaOf(yr, cur)} size="xs" suffix="vs YoY" />
                      </div>
                    </div>
                  )
                })}
                <div className="rounded-lg border border-accent/22 bg-accent/[0.055] px-2.5 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent-ink">
                    <Sparkles className="h-3 w-3" /> Contextual read
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-mid">{narrative(totals, previous, platforms)}</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* --- right rail: today ---------------------------------------- */}
        <div className="space-y-3.5">
          <TodayRail />
          <DeadlineRail deadlines={deadlines} onOpen={(id) => openPanel('content', { contentId: id })} />
        </div>
      </SplitGrid>

      {/* ==================================================================== */}
      {/* PIPELINE                                                             */}
      {/* ==================================================================== */}
      <Panel className="mb-4 overflow-hidden">
        <PanelHeader
          dense
          icon={<GitBranch />}
          title="Content pipeline"
          subtitle="Every stage connects to the next — nothing is orphaned"
          actions={
            <>
              <Badge tone="outline" size="xs" mono>
                {fmtNumber(ds.content.filter((c) => !['published', 'archived'].includes(c.status)).length)} active
              </Badge>
              <Button size="xs" variant="ghost" iconRight={<ChevronRight />} onClick={() => navigate('/content?view=board')}>
                Board
              </Button>
            </>
          }
        />
        <div className="overflow-x-auto p-4">
          <ol className="flex min-w-[760px] items-stretch gap-1.5" aria-label="Content pipeline stages">
            {pipeline.map((stage, i) => {
              const def = statusById(stage.id)
              const isBottleneck = stage.overdue > 0 || stage.stalled > 0
              return (
                <li key={stage.id} className="flex min-w-0 flex-1 items-stretch">
                  <button
                    onClick={() => navigate(`/content?view=board&status=${stage.id}`)}
                    className={cn(
                      'group relative flex min-w-0 flex-1 flex-col justify-between rounded-lg border px-2.5 py-2.5 text-left transition-all duration-250',
                      'border-line-2 bg-white/[0.014] hover:border-line-3 hover:bg-white/[0.035]',
                      isBottleneck && 'border-amber/25 bg-amber/[0.045]',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: def.accent, boxShadow: `0 0 7px ${def.accent}99` }} />
                      <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.05em] text-ink-mid">{stage.name}</span>
                    </span>
                    <span className="mt-2 flex items-end justify-between gap-1.5">
                      <span className="tnum text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink-hi">{stage.count}</span>
                      <span className="flex flex-col items-end gap-0.5">
                        {stage.velocity > 0 && (
                          <span className="mono text-[9px] text-emerald">
                            +{stage.velocity} in 14d
                          </span>
                        )}
                        {stage.overdue > 0 && (
                          <span className="mono flex items-center gap-1 text-[9px] text-rose">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {stage.overdue} late
                          </span>
                        )}
                        {stage.overdue === 0 && stage.stalled > 0 && <span className="mono text-[9px] text-amber">{stage.stalled} stalled</span>}
                      </span>
                    </span>
                    <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700 ease-[var(--ease-cockpit)]"
                        style={{
                          width: `${Math.min(100, (stage.count / Math.max(1, ...pipeline.map((p) => p.count))) * 100)}%`,
                          background: def.accent,
                          boxShadow: `0 0 8px -1px ${def.accent}`,
                        }}
                      />
                    </span>
                  </button>
                  {i < pipeline.length - 1 && (
                    <span className="flex w-4 shrink-0 items-center justify-center text-ink-ghost" aria-hidden>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </Panel>

      {/* ==================================================================== */}
      {/* PLATFORM BREAKDOWN + CONSISTENCY                                     */}
      {/* ==================================================================== */}
      <div className="mb-4 grid gap-3.5 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            dense
            icon={<Layers />}
            title="Platform breakdown"
            subtitle={`Reach share and momentum across the ${period.label.toLowerCase()}`}
            actions={
              <Button size="xs" variant="ghost" iconRight={<ChevronRight />} onClick={() => navigate('/analytics?section=platform')}>
                Detail
              </Button>
            }
          />
          <div className="p-4">
            <ChartPanel bare data={platformData}>
              <ShareBar
                segments={platforms.map((p) => ({ id: p.id, label: p.name, value: p.reach, color: p.color }))}
                height={9}
                showLabels
              />
            </ChartPanel>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPanel('drill', { platform: p.id, label: p.name })}
                  className="group rounded-lg border border-line-2 bg-white/[0.014] p-3 text-left transition-all duration-250 hover:border-line-3 hover:bg-white/[0.035]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color, boxShadow: `0 0 7px ${p.color}99` }} />
                      <span className="text-[11.5px] font-medium text-ink-hi">{p.name}</span>
                    </span>
                    <span className="mono text-[10px] text-ink-faint">{p.shareOfReach.toFixed(0)}%</span>
                  </div>
                  <p className="tnum mt-2 text-[19px] font-semibold leading-none text-ink-hi">{fmtNumber(p.reach, { compact: true })}</p>
                  <p className="mt-1 text-[10px] text-ink-faint">reach · {fmtNumber(p.followers, { compact: true })} followers</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Delta value={p.delta} size="xs" suffix={undefined} />
                    <Sparkline values={p.spark} color={p.color} width={54} height={18} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-line-1 pt-2">
                    <div>
                      <p className="cell-label">Eng. rate</p>
                      <p className="tnum mt-0.5 text-[11.5px] text-ink-hi">{p.engagementRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="cell-label">Published</p>
                      <p className="tnum mt-0.5 text-[11.5px] text-ink-hi">{p.publishedCount}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader dense icon={<Flame />} title="Posting consistency" subtitle="Impressions per day · dot = published" actions={<Badge tone="outline" size="xs" mono>22 weeks</Badge>} />
          <div className="p-4">
            <ChartPanel bare data={heatData}>
              <CalendarHeat cells={heat} weeks={22} color="#5B9DFF" onSelectDay={() => navigate('/calendar')} />
            </ChartPanel>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-1 pt-3">
              <MiniStat label="Publish days" value={`${heat.filter((c) => c.published > 0).length}`} hint="last 22 weeks" />
              <MiniStat label="Best day" value={bestDay(heat).label} hint={bestDay(heat).value} />
              <MiniStat label="Streak" value={`${streak(heat)} days`} hint="current" accent />
            </div>
          </div>
        </Panel>
      </div>

      {/* ==================================================================== */}
      {/* TOP CONTENT + HEALTH                                                 */}
      {/* ==================================================================== */}
      <div className="mb-4 grid gap-3.5 xl:grid-cols-[1.62fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            dense
            icon={<BarChart3 />}
            title="Content performance"
            subtitle="Attributed within the selected period · click a row for detail"
            actions={
              <Button size="xs" variant="ghost" iconRight={<ChevronRight />} onClick={() => navigate('/content?view=table')}>
                All content
              </Button>
            }
          />
          <ContentPerfTable
            rows={perfRows}
            onRow={(row) => openPanel('content', { contentId: row.id })}
            onOpen={(row) => navigate(`/content/${row.id}`)}
          />
        </Panel>

        <div className="space-y-3.5">
          <Panel className="overflow-hidden">
            <PanelHeader dense icon={<Heart />} title="Creator health" subtitle="Six signals, weighted by what blocks you" actions={<Button size="xs" variant="ghost" onClick={() => navigate('/analytics?section=health')}>Detail</Button>} />
            <p className="sr-only">{healthSummary}</p>
            <div className="space-y-2.5 p-4">
              {health.map((h) => {
                const tone = h.status === 'good' ? '#34D399' : h.status === 'watch' ? '#FBBF24' : '#FB7185'
                return (
                  <div key={h.id} className="flex items-center gap-3">
                    <Ring value={h.value} size={34} thickness={3} color={tone}>
                      <span className="tnum text-[9.5px] font-semibold" style={{ color: tone }}>
                        {Math.round(h.value)}
                      </span>
                    </Ring>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[11.5px] text-ink">{h.label}</span>
                        <span className="mono shrink-0 text-[10px] text-ink-mid">{h.display}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-ink-faint" title={h.detail}>
                        {h.detail}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader dense icon={<Target />} title="Topic momentum" subtitle="Top pillars by reach in period" actions={<Button size="xs" variant="ghost" onClick={() => navigate('/analytics?section=topics')}>Map</Button>} />
            <div className="p-4">
              <ChartPanel bare data={topicData}>
                <RankedBars
                  rows={topics.map((t) => ({ id: t.id, label: t.name, value: t.reach, color: t.color, sub: `${t.pieces} pieces · ${t.engagementRate.toFixed(1)}% ER` }))}
                  metricId="reach"
                  height={168}
                  onSelect={(id) => {
                    const t = topics.find((x) => x.id === id)
                    openPanel('drill', { topicId: id, label: t?.name })
                  }}
                />
              </ChartPanel>
            </div>
          </Panel>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* FOOTER STRIP: OUTPUT + NEXT ACTIONS                                  */}
      {/* ==================================================================== */}
      <div className="grid gap-3.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader dense icon={<Zap />} title="Output rhythm" subtitle="Pieces published per week, by platform" />
          <div className="p-4">
            <ChartPanel bare data={rhythmData}>
              <MetricBars
                rows={rhythm}
                series={[
                  { id: 'yt', key: 'youtube', label: 'YouTube', color: '#FF5A5A', metricId: 'views' },
                  { id: 'ig', key: 'instagram', label: 'Instagram', color: '#D976FF', metricId: 'views' },
                  { id: 'li', key: 'linkedin', label: 'LinkedIn', color: '#4DA3FF', metricId: 'views' },
                ]}
                stacked
                height={176}
              />
            </ChartPanel>
          </div>
        </Panel>

        <Panel className="relative overflow-hidden">
          <div className="grid-etch p-4">
            <p className="cell-label">Next best actions</p>
            <ul className="mt-3 space-y-2">
              {nextActions(ds, health, platforms).map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.href}
                    className="group flex items-start gap-2.5 rounded-lg border border-line-1 bg-white/[0.014] px-2.5 py-2 transition-colors hover:border-line-3 hover:bg-white/[0.03]"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border" style={{ borderColor: `${a.color}44`, background: `${a.color}16`, color: a.color }}>
                      <a.icon className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] leading-snug text-ink">{a.label}</span>
                      <span className="mt-0.5 block text-[10px] text-ink-faint">{a.reason}</span>
                    </span>
                    <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-ink-ghost transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <p className="mt-5 flex items-center gap-2 text-[10.5px] text-ink-ghost">
        <span className="h-1 w-1 rounded-full bg-emerald" />
        Simulated dataset · deterministic seed {`{20261002}`} · {ds.content.length} content objects · {fmtNumber(ds.metrics.length)} metric samples
      </p>
    </Page>
  )
}

/* ============================================================================
   SUB-COMPONENTS
   ========================================================================== */

function PageHead({ greeting, name, mission, overdue, onNew }: { greeting: string; name: string; mission: string; overdue: number; onNew: () => void }) {
  const ds = useDataset()
  const now = new Date()
  return (
    <header className="relative mb-4 pb-4">
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent/45 via-white/[0.07] to-transparent"
        aria-hidden
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-[blip_2.4s_ease-in-out_infinite] rounded-full bg-accent" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="cell-label text-accent/90">Command center</span>
            <span className="mono text-[10px] text-ink-faint">
              {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {ds.creator.timezone.split(' · ')[1] ?? 'IST'}
            </span>
          </div>
          <h1 className="title-1">{greeting}, {name}.</h1>
          <p className="mt-1.5 max-w-[76ch] text-[12.5px] leading-relaxed text-ink-low">{mission}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overdue > 0 && (
            <Link
              to="/content?view=table&status=production,editing,review,ready"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose/28 bg-rose/[0.09] px-3 text-[12px] font-medium text-rose transition-colors hover:bg-rose/[0.15]"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdue} overdue commitment{overdue > 1 ? 's' : ''}
            </Link>
          )}
          <Button variant="primary" size="md" icon={<Sparkles />} onClick={onNew}>
            New content
          </Button>
        </div>
      </div>
    </header>
  )
}

function TodayRail() {
  const ds = useDataset()
  const navigate = useNavigate()
  const openPanel = useApp((s) => s.openPanel)

  const inMotion = ds.content
    .filter((c) => ['production', 'editing', 'review', 'ready'].includes(c.status))
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
    .slice(0, 4)

  const focusMinutes = inMotion.reduce((s, c) => s + c.effortHours * 60 * 0.4, 0)

  return (
    <Panel glow={1} className="overflow-hidden">
      <PanelHeader
        dense
        icon={<CalendarClock />}
        title="Today"
        subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <Tooltip content="Estimated focus time from in-flight work" side="left">
            <Badge tone="accent" size="xs" mono>
              ~{(focusMinutes / 60).toFixed(1)}h focus
            </Badge>
          </Tooltip>
        }
      />
      <ul className="divide-y divide-[var(--color-line-1)]">
        {inMotion.map((c) => {
          const days = relativeDays(c.deadline)
          const late = days !== null && days < 0
          const soon = days !== null && days >= 0 && days <= 3
          const done = c.checklist.filter((x) => x.done).length
          return (
            <li key={c.id}>
              <button
                onClick={() => openPanel('content', { contentId: c.id })}
                className="group flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.028]"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(c.platforms[0]).color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-ink-hi">{c.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <StatusPill name={statusById(c.status).name} color={statusById(c.status).accent} />
                    <span className="mono text-[9.5px] text-ink-faint">
                      {done}/{c.checklist.length}
                    </span>
                    {c.deadline && (
                      <span className={cn('mono text-[9.5px]', late ? 'text-rose' : soon ? 'text-amber' : 'text-ink-faint')}>
                        {fmtRelativeFuture(c.deadline)}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-ghost transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            </li>
          )
        })}
        {!inMotion.length && <EmptyState compact title="Nothing in production" body="Move an idea forward to start the week's build." />}
      </ul>
      <div className="border-t border-line-2 p-2">
        <Button variant="ghost" size="xs" block onClick={() => navigate('/content?view=board')} iconRight={<ChevronRight />}>
          Open production board
        </Button>
      </div>
    </Panel>
  )
}

function DeadlineRail({ deadlines, onOpen }: { deadlines: ReturnType<typeof useMemo<ReturnType<typeof scopeContent>>>; onOpen: (id: string) => void }) {
  if (!deadlines.length) return null
  return (
    <Panel className="overflow-hidden">
      <PanelHeader dense icon={<Clock />} title="Commitments" subtitle="Across campaigns and brand deals" />
      <ul className="divide-y divide-[var(--color-line-1)]">
        {deadlines.map((c) => {
          const days = relativeDays(c.deadline)
          const late = days !== null && days < 0
          return (
            <li key={c.id}>
              <button onClick={() => onOpen(c.id)} className="group flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/[0.028]">
                <span
                  className={cn(
                    'mono grid h-7 w-9 shrink-0 place-items-center rounded-md border text-[10px] font-medium',
                    late ? 'border-rose/30 bg-rose/[0.1] text-rose' : days !== null && days <= 3 ? 'border-amber/30 bg-amber/[0.1] text-amber' : 'border-line-2 bg-white/[0.03] text-ink-mid',
                  )}
                >
                  {days !== null ? (late ? `${Math.abs(days)}d` : `${days}d`) : '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] text-ink">{c.title}</span>
                  <span className="mono block truncate text-[9.5px] text-ink-faint">
                    {statusById(c.status).name} · {c.platforms.map((p) => platformById(p).short).join(' + ')}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function ContentPerfTable({ rows, onRow, onOpen }: { rows: ContentRow[]; onRow: (row: ContentRow) => void; onOpen: (row: ContentRow) => void }) {
  const columns: Column<ContentRow>[] = [
    {
      id: 'title',
      header: 'Content',
      primary: true,
      width: 300,
      sortValue: (r) => r.title,
      filterValue: (r) => r.title,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(r.platform).color }} />
          <span className="min-w-0">
            <span className="block truncate text-[12px] text-ink-hi">{r.title}</span>
            <span className="mono block truncate text-[9.5px] text-ink-faint">
              {r.code} · {CONTENT_TYPES.find((t) => t.id === r.typeId)?.name ?? r.format}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'platform',
      header: 'Platform',
      width: 96,
      sortValue: (r) => r.platform,
      filterValue: (r) => platformById(r.platform).name,
      cell: (r) => <span className="text-[11.5px]" style={{ color: platformById(r.platform).color }}>{platformById(r.platform).name}</span>,
    },
    { id: 'published', header: 'Publish', width: 92, sortValue: (r) => r.published ?? '', cell: (r) => <span className="mono text-[10.5px] text-ink-low">{fmtDate(r.published, 'short')}</span> },
    { id: 'views', header: 'Views', width: 88, align: 'right', numeric: true, sortValue: (r) => r.views, cell: (r) => fmtNumber(r.views) },
    { id: 'reach', header: 'Reach', width: 92, align: 'right', numeric: true, sortValue: (r) => r.reach, cell: (r) => fmtNumber(r.reach) },
    { id: 'er', header: 'Eng.', width: 74, align: 'right', numeric: true, sortValue: (r) => r.engagementRate, cell: (r) => `${r.engagementRate.toFixed(1)}%` },
    { id: 'watch', header: 'Watch', width: 84, align: 'right', numeric: true, sortValue: (r) => r.watchMinutes, cell: (r) => fmtDuration(r.watchMinutes) },
    {
      id: 'growth',
      header: 'Growth',
      width: 96,
      align: 'right',
      numeric: true,
      headerHint: 'Share of total follower growth in the selected period',
      sortValue: (r) => r.growthContribution,
      cell: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.07]">
            <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, r.growthContribution * 6)}%` }} />
          </span>
          <span className="w-9 text-right text-[10.5px] text-emerald">{r.growthContribution.toFixed(1)}%</span>
        </span>
      ),
    },
    { id: 'trend', header: 'Trend', width: 84, cell: (r) => <Sparkline values={r.spark} color={platformById(r.platform).color} width={62} height={18} /> },
  ]

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowHeight={40}
      onRowClick={onRow}
      rowActions={(r) => (
        <IconButton
          label="Open workspace"
          icon={<ArrowUpRight />}
          size="xs"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(r)
          }}
        />
      )}
      empty={<EmptyState compact title="No performance in this range" body="Publish something, or widen the period filter." />}
    />
  )
}

function MiniStat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div>
      <p className="cell-label">{label}</p>
      <p className={cn('tnum mt-1 text-[15px] font-semibold leading-none', accent ? 'text-accent' : 'text-ink-hi')}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-ink-faint">{hint}</p>}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <Page width="wide">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-3 h-4 w-[420px]" />
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-3.5 xl:grid-cols-[1.62fr_1fr]">
        <Skeleton className="h-[380px] rounded-xl" />
        <div className="space-y-3.5">
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
      </div>
    </Page>
  )
}

/* ============================================================================
   HELPERS
   ========================================================================== */
const metricValue = (t: Record<string, number>, id: string) => t[id] ?? 0
const deltaOf = (prev: number, cur: number) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : 0)

function bestDay(heat: { date: string; value: number }[]) {
  const best = heat.reduce((a, b) => (b.value > a.value ? b : a), heat[0] ?? { date: '', value: 0 })
  return { label: best?.date ? fmtDate(best.date, 'short') : '—', value: best ? `${fmtNumber(best.value, { compact: true })} impr.` : '' }
}

function streak(heat: { date: string; intensity: number }[]) {
  let count = 0
  for (let i = heat.length - 1; i >= 0; i--) {
    if (heat[i].intensity > 0.32) count++
    else break
  }
  return count
}

function publishRhythm(ds: ReturnType<typeof useDataset>) {
  const today = new Date(ds.todayKey + 'T00:00:00')
  return Array.from({ length: 6 }, (_, idx) => {
    const weeksAgo = 5 - idx
    const start = new Date(today)
    start.setDate(start.getDate() - (weeksAgo * 7 + 6))
    const end = new Date(today)
    end.setDate(end.getDate() - weeksAgo * 7)
    const iso = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
    const s = iso(start)
    const e = iso(end)
    const inWeek = ds.content.filter((c) => c.publishDate && c.publishDate >= s && c.publishDate <= e)
    return {
      label: fmtDate(s, 'short'),
      youtube: inWeek.filter((c) => c.platforms.includes('youtube')).length,
      instagram: inWeek.filter((c) => c.platforms.includes('instagram')).length,
      linkedin: inWeek.filter((c) => c.platforms.includes('linkedin')).length,
    }
  })
}

function narrative(
  totals: ReturnType<typeof aggregate>,
  previous: ReturnType<typeof aggregate>,
  platforms: ReturnType<typeof platformBreakdown>,
): string {
  const growth = deltaOf(previous.reach, totals.reach)
  const best = [...platforms].sort((a, b) => b.delta - a.delta)[0]
  const erDelta = deltaOf(previous.engagementRate, totals.engagementRate)
  const parts: string[] = []
  parts.push(growth >= 5 ? `Reach is up ${fmtSignedPercent(growth)} — the strongest stretch in the observed window.` : growth >= 0 ? `Reach is holding at ${fmtSignedPercent(growth)}.` : `Reach is down ${fmtSignedPercent(growth)}; check publishing cadence.`)
  if (best) parts.push(`${best.name} is moving fastest at ${fmtSignedPercent(best.delta)}.`)
  parts.push(erDelta < -6 ? 'Engagement is softening relative to reach — the payoff is landing late.' : 'Engagement is tracking with reach, so the audience quality is holding.')
  return parts.join(' ')
}

function nextActions(
  ds: ReturnType<typeof useDataset>,
  health: ReturnType<typeof creatorHealth>,
  platforms: ReturnType<typeof platformBreakdown>,
): { id: string; label: string; reason: string; href: string; color: string; icon: typeof Target }[] {
  const out: { id: string; label: string; reason: string; href: string; color: string; icon: typeof Target }[] = []
  const overdue = ds.content.filter((c) => c.deadline && c.deadline < ds.todayKey && !['published', 'archived'].includes(c.status))
  if (overdue.length) {
    out.push({
      id: 'overdue',
      label: `Clear ${overdue.length} overdue commitment${overdue.length > 1 ? 's' : ''}`,
      reason: `${overdue[0].title} is blocking every downstream derivative.`,
      href: '/content?view=table&status=production,editing,review,ready',
      color: '#FB7185',
      icon: AlertTriangle,
    })
  }
  const lowest = [...health].sort((a, b) => a.value - b.value)[0]
  if (lowest && lowest.value < 70) {
    out.push({ id: 'health', label: `Improve ${lowest.label.toLowerCase()}`, reason: lowest.detail, href: '/analytics?section=health', color: '#FBBF24', icon: Target })
  }
  const readyToShip = ds.content.filter((c) => c.status === 'ready')
  if (readyToShip.length) {
    out.push({
      id: 'ship',
      label: `Ship ${readyToShip.length} finished piece${readyToShip.length > 1 ? 's' : ''}`,
      reason: 'Finished work sitting unpublished loses topical relevance every day.',
      href: '/content?view=table&status=ready',
      color: '#34D399',
      icon: Zap,
    })
  }
  const cold = platforms.reduce((a, b) => (b.delta < a.delta ? b : a), platforms[0])
  if (cold) {
    out.push({
      id: 'cold',
      label: `Repurpose for ${cold.name}`,
      reason: `${cold.name} grew ${fmtSignedPercent(cold.delta)} — a derivative from your best video is the cheapest lift.`,
      href: '/analytics?section=roi',
      color: cold.color,
      icon: GitBranch,
    })
  }
  return out.slice(0, 4)
}

export { PulseChip, Progress }
