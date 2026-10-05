import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  ChevronRight,
  Gauge as GaugeIcon,
  Grid3x3,
  Layers,
  LineChart,
  MoveDiagonal,
  Repeat,
  Route,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { LIVE_PLATFORMS, platformById } from '@/data/registry'
import { fmtCurrency, fmtDuration, fmtNumber, fmtPercent } from '@/lib/format'
import {
  activityProfile,
  calendarHeatmap,
  chartRows,
  contentRows,
  creatorHealth,
  dnaBreakdown,
  formatStats,
  funnelStages,
  platformBreakdown,
  retentionCurve,
  roiPoints,
  scopedTotals,
  topicStats,
} from '@/analytics/queries'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton } from '@/components/ui/Surface'
import { Page, PageHeader, MetricStrip } from '@/components/ui/Page'
import { DescriptionList } from '@/components/ui/blocks'
import { Segmented } from '@/components/ui/Field'
import { FilterBar } from '@/components/shell/FilterBar'
import { MetricTrend, Sparkline } from '@/components/charts/LineArea'
import { MetricBars, RankedBars, ShareBar } from '@/components/charts/Bars'
import { ActivityGrid, BubbleMatrix, CalendarHeat, Funnel, Gauge, HeatGrid, RadarViz, RetentionBand, TreemapViz, Waterfall } from '@/components/charts/Special'
import { ChartPanel, chartData, type ChartData, Legend } from '@/components/charts/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'

/* ============================================================================
   ANALYTICS
   Thirteen sections, one scope. Every chart reads the same filtered query
   layer, so the numbers on this page always reconcile with the dashboard and
   with the content object a drill-down lands on.
   ========================================================================== */

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: GaugeIcon },
  { id: 'growth', label: 'Growth', icon: LineChart },
  { id: 'reach', label: 'Reach', icon: Activity },
  { id: 'engagement', label: 'Engagement', icon: Zap },
  { id: 'retention', label: 'Retention', icon: Repeat },
  { id: 'platforms', label: 'Platforms', icon: Grid3x3 },
  { id: 'topics', label: 'Topics', icon: Layers },
  { id: 'formats', label: 'Formats', icon: BarChart3 },
  { id: 'matrix', label: 'Matrix', icon: MoveDiagonal },
  { id: 'funnel', label: 'Funnel', icon: Route },
  { id: 'cadence', label: 'Cadence', icon: CalendarRange },
  { id: 'efficiency', label: 'Efficiency', icon: Target },
  { id: 'health', label: 'Health', icon: Users },
]

export function AnalyticsPage() {
  const ds = useDataset()
  const settled = useSettled(240)
  const filters = useApp((s) => s.filters)
  const openPanel = useApp((s) => s.openPanel)
  const [params, setParams] = useSearchParams()
  const [compare, setCompare] = useState<'none' | 'previous' | 'year'>('previous')
  const [radarVisible, setRadarVisible] = useState<string[]>([])
  const [active, setActive] = useState('overview')
  const railRef = useRef<HTMLDivElement>(null)

  const scoped = useMemo(() => scopedTotals(ds, filters), [ds, filters])
  const trends = useMemo(() => chartRows(ds, filters, { compare: compare === 'none' ? undefined : compare }), [ds, filters, compare])
  const platforms = useMemo(() => platformBreakdown(ds, filters), [ds, filters])
  const topics = useMemo(() => topicStats(ds, filters), [ds, filters])
  const formats = useMemo(() => formatStats(ds, filters), [ds, filters])
  const funnel = useMemo(() => funnelStages(ds, filters), [ds, filters])
  const retention = useMemo(() => retentionCurve(ds, filters), [ds, filters])
  const health = useMemo(() => creatorHealth(ds, filters), [ds, filters])
  const roi = useMemo(() => roiPoints(ds, filters), [ds, filters])
  const content = useMemo(() => contentRows(ds, filters), [ds, filters])
  const heat = useMemo(() => calendarHeatmap(ds, filters, 27), [ds, filters])
  const activity = useMemo(() => activityProfile(ds, filters), [ds, filters])

  /* Every chart on this page is backed by the same rows it draws, so the
     "show as table" view and the screen-reader summary can never drift. */
  const trendData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Bucket' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'reach', label: 'Reach', align: 'right' },
          { key: 'engagements', label: 'Engagements', align: 'right' },
        ],
        trends.rows.map((r) => ({ label: r.label, views: r.views, reach: r.reach, engagements: r.engagements })),
        { unit: `${trends.granularity} bucket` },
      ),
    [trends],
  )

  const growthSeries = useMemo(() => {
    const keys = ['reach', 'watchMinutes', 'followersGained'] as const
    const labels: Record<string, string> = { reach: 'Reach', watchMinutes: 'Watch time', followersGained: 'Followers gained' }
    const out: Record<string, ChartData> = {}
    for (const k of keys) {
      out[k] = chartData(
        [
          { key: 'label', label: 'Bucket' },
          { key: k, label: labels[k], align: 'right', format: (v: number) => (k === 'watchMinutes' ? fmtDuration(v) : fmtNumber(v)) },
        ],
        trends.rows.map((r) => ({ label: r.label, [k]: r[k] })),
        { unit: `${trends.granularity} bucket` },
      )
    }
    return out
  }, [trends])

  const engagementMixData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Bucket' },
          { key: 'likes', label: 'Likes', align: 'right' },
          { key: 'comments', label: 'Comments', align: 'right' },
          { key: 'shares', label: 'Shares', align: 'right' },
          { key: 'saves', label: 'Saves', align: 'right' },
        ],
        trends.rows.map((r) => ({ label: r.label, likes: r.likes, comments: r.comments, shares: r.shares, saves: r.saves })),
        { unit: 'bucket', caption: 'Engagement by signal type' },
      ),
    [trends],
  )

  const engagementRateData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Bucket' },
          { key: 'engagementRate', label: 'Engagement rate', align: 'right', format: (v: number) => `${v.toFixed(2)}%` },
        ],
        trends.rows.map((r) => ({ label: r.label, engagementRate: Number(r.engagementRate.toFixed(2)) })),
        { unit: 'bucket' },
      ),
    [trends],
  )

  const retentionData = useMemo(
    () =>
      chartData(
        [
          { key: 'pct', label: 'Position', format: (v: number) => `${v}%` },
          { key: 'value', label: 'Still watching', align: 'right', format: (v: number) => `${v}%` },
          { key: 'best', label: 'Best decile', align: 'right', format: (v: number) => `${v}%` },
          { key: 'worst', label: 'Worst decile', align: 'right', format: (v: number) => `${v}%` },
        ],
        retention.map((p) => ({ pct: p.pct, value: p.value, best: p.best, worst: p.worst })),
        { unit: 'point', caption: 'Aggregate retention curve with best and worst deciles' },
      ),
    [retention],
  )

  const formatRetentionData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Format' },
          { key: 'retention', label: 'Completion', align: 'right', format: (v: number) => `${Math.round(v * 100)}%` },
          { key: 'pieces', label: 'Pieces', align: 'right' },
        ],
        formats
          .filter((f) => f.pieces > 0)
          .map((f) => ({ name: f.name, retention: f.retention, pieces: f.pieces })),
        { unit: 'format' },
      ),
    [formats],
  )

  const topicTreemapData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Topic' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'pieces', label: 'Pieces', align: 'right' },
          { key: 'avgViews', label: 'Avg views', align: 'right' },
        ],
        topics.slice(0, 12).map((t) => ({ name: t.name, views: t.views, pieces: t.pieces, avgViews: Math.round(t.avgViews) })),
        { unit: 'topic', caption: 'Topic treemap — area is views' },
      ),
    [topics],
  )

  const topicEfficiencyData = useMemo(() => {
    const rows = [...topics].sort((a, b) => b.revenuePerHour - a.revenuePerHour || b.views - a.views).slice(0, 9)
    return chartData(
      [
        { key: 'name', label: 'Topic' },
        { key: 'views', label: 'Views', align: 'right' },
        { key: 'effortHours', label: 'Hours', align: 'right', format: (v: number) => `${Math.round(v)}h` },
        { key: 'viewsPerHour', label: 'Views / hour', align: 'right' },
        { key: 'engagementRate', label: 'Eng. rate', align: 'right', format: (v: number) => `${v.toFixed(2)}%` },
      ],
      rows.map((t) => ({
        name: t.name,
        views: t.views,
        effortHours: t.effortHours,
        viewsPerHour: t.effortHours ? Math.round(t.views / t.effortHours) : t.views,
        engagementRate: Number(t.engagementRate.toFixed(2)),
      })),
      { unit: 'topic', caption: 'Views earned per production hour by topic' },
    )
  }, [topics])

  const formatCompareData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Format' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'viewsPerHour', label: 'Views / hour', align: 'right' },
          { key: 'pieces', label: 'Pieces', align: 'right' },
          { key: 'effort', label: 'Avg hours', align: 'right', format: (v: number) => `${v.toFixed(1)}h` },
        ],
        formats.map((f) => ({ name: f.name, views: f.views, viewsPerHour: Math.round(f.viewsPerHour), pieces: f.pieces, effort: f.effort })),
        { unit: 'format', caption: 'Format comparison, sorted by views per production hour' },
      ),
    [formats],
  )

  /* Format capability profile. Six axes, each normalised against the strongest
     format on that axis, so the shape is comparable rather than the scale. */
  const RADAR_AXES = [
    { id: 'reach', label: 'Reach' },
    { id: 'engagementRate', label: 'Engagement' },
    { id: 'retention', label: 'Retention' },
    { id: 'followersGained', label: 'Followers' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'efficiency', label: 'Efficiency' },
  ]

  const radarSeries = useMemo(() => {
    const colours = ['#5B9DFF', '#A78BFA', '#34D399']
    const top = formats.slice(0, 3)
    const maxes = Object.fromEntries(
      RADAR_AXES.map((a) => {
        const key = a.id === 'efficiency' ? 'viewsPerHour' : a.id
        return [a.id, Math.max(...formats.map((f) => Number((f as unknown as Record<string, number>)[key] ?? 0)), 1)]
      }),
    )
    return top.map((f, i) => ({
      id: f.id,
      label: f.name,
      color: colours[i % colours.length],
      values: RADAR_AXES.map((a) => {
        const key = a.id === 'efficiency' ? 'viewsPerHour' : a.id
        const v = Number((f as unknown as Record<string, number>)[key] ?? 0)
        return Math.max(0.04, Math.min(1, v / maxes[a.id]))
      }),
    }))
  }, [formats])

  const radarData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Format' },
          ...RADAR_AXES.map((a) => ({ key: a.id, label: a.label, align: 'right' as const, format: (v: number) => v.toFixed(3) })),
        ],
        formats.slice(0, 3).map((f) => {
          const row: Record<string, string | number> = { name: f.name }
          const series = radarSeries.find((r) => r.id === f.id)
          RADAR_AXES.forEach((a, ai) => (row[a.id] = Number((series?.values[ai] ?? 0).toFixed(3))))
          return row
        }),
        { unit: 'format', caption: 'Format capability profile, normalised per axis' },
      ),
    [formats, radarSeries],
  )

  const matrixData = useMemo(
    () =>
      chartData(
        [
          { key: 'title', label: 'Content' },
          { key: 'platform', label: 'Platform' },
          { key: 'effort', label: 'Effort (h)', align: 'right' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'reach', label: 'Reach', align: 'right' },
          { key: 'efficiency', label: 'Reach / hour', align: 'right' },
        ],
        roi.map((r) => ({
          title: r.title,
          platform: platformById(r.platform).name,
          effort: r.effort,
          views: r.views,
          reach: r.reach,
          efficiency: r.efficiency,
        })),
        { unit: 'content item', caption: 'Impact versus effort for every piece in scope' },
      ),
    [roi],
  )

  const funnelData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Stage' },
          { key: 'value', label: 'Volume', align: 'right' },
          { key: 'share', label: 'Share of impressions', align: 'right', format: (v: number) => `${v.toFixed(2)}%` },
          { key: 'stepRate', label: 'Carried forward', align: 'right', format: (v: number) => `${v.toFixed(1)}%` },
        ],
        funnel.map((s) => ({ label: s.label, value: s.value, share: s.share, stepRate: s.stepRate })),
        { unit: 'stage', caption: 'Attention funnel from impressions to follows' },
      ),
    [funnel],
  )

  const heatData = useMemo(
    () =>
      chartData(
        [
          { key: 'date', label: 'Date' },
          { key: 'value', label: 'Views', align: 'right' },
          { key: 'published', label: 'Published', align: 'right' },
        ],
        heat.map((c) => ({ date: fmtDateShort(c.date), value: c.value, published: c.published })),
        { unit: 'day', caption: 'Publishing calendar heat across 27 weeks' },
      ),
    [heat],
  )

  const activityData = useMemo(
    () =>
      chartData(
        [
          { key: 'day', label: 'Weekday' },
          ...activity.hours.map((h) => ({ key: String(h), label: `${h}:00`, align: 'right' as const })),
        ],
        activity.rows.map((r) => {
          const row: Record<string, string | number> = { day: r.day }
          activity.hours.forEach((h, hi) => (row[String(h)] = r.values[hi] ?? 0))
          return row
        }),
        { unit: 'weekday', caption: 'Engagement intensity by weekday and hour' },
      ),
    [activity],
  )

  const waterfallData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Month' },
          { key: 'value', label: 'Amount', align: 'right', format: (v: number) => fmtCurrency(v) },
        ],
        revenueWaterfall(ds).map((r) => ({ label: r.label, value: r.value })),
        { unit: 'month', caption: 'Monthly revenue, expenses and net' },
      ),
    // revenueWaterfall reads the live filter state, so it recomputes with it.
    [ds, filters],
  )

  const effortTierData = useMemo(
    () =>
      chartData(
        [
          { key: 'tier', label: 'Effort tier' },
          { key: 'pieces', label: 'Pieces', align: 'right' },
          { key: 'hours', label: 'Hours', align: 'right' },
          { key: 'reach', label: 'Reach', align: 'right' },
          { key: 'reachPerHour', label: 'Reach / hour', align: 'right' },
        ],
        ['Light', 'Standard', 'Heavy'].map((tier) => {
          const rows = roi.filter((r) => r.effortTier === tier && r.views > 0)
          const reach = rows.reduce((s, r) => s + r.reach, 0)
          const hours = rows.reduce((s, r) => s + r.effort, 0)
          return { tier, pieces: rows.length, hours, reach, reachPerHour: hours ? Math.round(reach / hours) : 0 }
        }),
        { unit: 'tier', caption: 'Reach per production hour by effort tier' },
      ),
    [roi],
  )

  const healthData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Pillar' },
          { key: 'display', label: 'Measured' },
          { key: 'value', label: 'Score', align: 'right', format: (v: number) => `${Math.round(v)}/100` },
          { key: 'target', label: 'Target' },
          { key: 'status', label: 'Status' },
        ],
        health.map((h) => ({ label: h.label, display: h.display, value: h.value, target: h.target, status: h.status })),
        { unit: 'pillar', caption: 'Creator health pillars measured against their targets' },
      ),
    [health],
  )

  /* Per-platform series for stacked comparison bars. */
  const platformSeries = useMemo(() => {
    const per = LIVE_PLATFORMS.map((p) => ({
      platform: p,
      rows: chartRows(ds, { ...filters, platforms: [p.id] }, {}).rows,
    }))
    const max = Math.max(...per.map((x) => x.rows.length), 0)
    const rows = Array.from({ length: max }, (_, i) => {
      const out: Record<string, unknown> = { label: per[0]?.rows[i]?.label ?? '', date: per[0]?.rows[i]?.date ?? '' }
      per.forEach((x) => {
        const r = x.rows[i]
        out[x.platform.id] = r?.views ?? 0
        out[`${x.platform.id}_reach`] = r?.reach ?? 0
      })
      return out
    })
    return rows
  }, [ds, filters])

  const platformStackData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Bucket' },
          ...LIVE_PLATFORMS.map((p) => ({ key: p.id, label: p.name, align: 'right' as const })),
        ],
        platformSeries.map((r) => {
          const row: Record<string, string | number> = { label: String(r.label ?? '') }
          for (const p of LIVE_PLATFORMS) row[p.id] = Number((r as Record<string, number>)[p.id] ?? 0)
          return row
        }),
        { unit: 'bucket', caption: 'Views per platform per bucket' },
      ),
    [platformSeries],
  )

  /* Scroll spy for the section rail. */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: [0.05, 0.3, 0.6] },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [settled])

  /* Deep link from the dashboard, e.g. /analytics?section=topics */
  useEffect(() => {
    const target = params.get('section')
    if (!target) return
    const el = document.getElementById(target)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [params, settled])

  if (!settled) {
    return (
      <Page width="full">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-3 h-4 w-[460px]" />
        <Skeleton className="mt-5 h-[560px] rounded-xl" />
      </Page>
    )
  }

  const t = scoped.totals
  const p = scoped.previous
  const viewsPerHour = t.watchMinutes > 0 ? t.views / (t.watchMinutes / 60) : 0
  const revenuePer1k = t.views > 0 ? (t.revenue / (t.views / 1000)) : 0
  const engagementMix = [
    { id: 'likes', label: 'Likes', value: t.likes, color: '#5B9DFF' },
    { id: 'comments', label: 'Comments', value: t.comments, color: '#A78BFA' },
    { id: 'shares', label: 'Shares', value: t.shares, color: '#34D399' },
    { id: 'saves', label: 'Saves', value: t.saves, color: '#FBBF24' },
  ]

  const matrixPoints = roi.map((r) => ({
    id: r.id,
    x: r.effort,
    y: r.views,
    z: Math.max(1, r.effort ? r.reach / r.effort : 1),
    color: platformById(r.platform).color,
    label: r.title,
    platform: platformById(r.platform).name,
    meta: `${fmtNumber(r.views, { compact: true })} views · ${r.effort}h effort · ${r.effortTier}`,
  }))

  const winners = [...roi].filter((r) => r.views > 0).sort((a, b) => b.efficiency - a.efficiency).slice(0, 4)
  const drains = [...roi].filter((r) => r.views > 0).sort((a, b) => a.efficiency - b.efficiency).slice(0, 4)

  return (
    <Page width="full">
      <PageHeader
        eyebrow="Analytics"
        title="Performance intelligence"
        description="Thirteen views of the same filtered scope. Every chart is drillable down to the content object that produced the point."
        meta={<FilterBar showCustomRange />}
        actions={
          <Segmented
            ariaLabel="Comparison window"
            value={compare}
            onChange={setCompare}
            options={[
              { id: 'none', label: 'No compare' },
              { id: 'previous', label: 'vs previous' },
              { id: 'year', label: 'vs last year' },
            ]}
          />
        }
      />

      {/* ---- section rail ------------------------------------------------- */}
      <div ref={railRef} className="sticky top-0 z-10 -mx-1 mb-3.5 flex gap-1 overflow-x-auto border-y border-line-2 bg-base/85 px-1 py-2 backdrop-blur-xl">
        {SECTIONS.map((s) => {
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              onClick={() => {
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                const next = new URLSearchParams(params)
                next.set('section', s.id)
                setParams(next, { replace: true })
              }}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] transition-all duration-200',
                isActive ? 'bg-white/[0.08] text-ink-hi' : 'text-ink-low hover:bg-white/[0.04] hover:text-ink',
              )}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
              {isActive && <span className="ml-0.5 h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />}
            </button>
          )
        })}
        {scoped.scoped && (
          <span className="ml-auto shrink-0 self-center">
            <Badge tone="accent" size="xs">
              {scoped.contentCount} content objects in scope
            </Badge>
          </span>
        )}
      </div>

      {/* ================================================================= NO.1 */}
      <Section id="overview" title="Overview" hint="The seven numbers that describe the whole operation in this scope.">
        <MetricStrip
          className="mb-3.5"
          items={[
            { label: 'Views', value: fmtNumber(t.views, { compact: true }), delta: <DeltaInline value={t.views} prev={p.views} />, hint: `${fmtNumber(t.views)} exact` },
            { label: 'Reach', value: fmtNumber(t.reach, { compact: true }), delta: <DeltaInline value={t.reach} prev={p.reach} />, hint: `${fmtPercent((t.reach / (t.views || 1)) * 100, 0)} of views` },
            { label: 'Impressions', value: fmtNumber(t.impressions, { compact: true }), delta: <DeltaInline value={t.impressions} prev={p.impressions} />, hint: 'across all surfaces' },
            { label: 'Engagements', value: fmtNumber(t.engagements, { compact: true }), delta: <DeltaInline value={t.engagements} prev={p.engagements} />, hint: `${t.engagementRate.toFixed(2)}% rate` },
            { label: 'Watch time', value: fmtDuration(t.watchMinutes), delta: <DeltaInline value={t.watchMinutes} prev={p.watchMinutes} />, hint: `${viewsPerHour.toFixed(1)} views / hour` },
            { label: 'Followers', value: `+${fmtNumber(t.followersGained, { compact: true })}`, delta: <DeltaInline value={t.followersGained} prev={p.followersGained} />, hint: `${fmtNumber(t.followers, { compact: true })} total` },
            { label: 'Revenue', value: fmtCurrency(t.revenue, { compact: true }), delta: <DeltaInline value={t.revenue} prev={p.revenue} />, hint: `${fmtCurrency(revenuePer1k)} / 1k views` },
          ]}
        />

        <div className="grid gap-3.5 lg:grid-cols-3">
          <Panel className="p-4">
            <PanelHeader dense icon={<Zap />} title="Attention efficiency" subtitle="How much audience attention each unit of output earns" />
            <div className="mt-3 space-y-3.5">
              {[
                { label: 'Views per hour watched', value: viewsPerHour.toFixed(2), target: '> 12', ok: viewsPerHour > 12 },
                { label: 'Engagement per 1k views', value: fmtNumber(Math.round((t.engagements / (t.views || 1)) * 1000)), target: '> 55', ok: (t.engagements / (t.views || 1)) * 1000 > 55 },
                { label: 'Follows per 1k views', value: ((t.followersGained / (t.views || 1)) * 1000).toFixed(2), target: '> 2.4', ok: (t.followersGained / (t.views || 1)) * 1000 > 2.4 },
                { label: 'Revenue per 1k views', value: fmtCurrency(revenuePer1k), target: '> $2.80', ok: revenuePer1k > 2.8 },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11.5px] text-ink-mid">{r.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="tnum text-[12px] text-ink-hi">{r.value}</span>
                      <span className={cn('mono text-[10px]', r.ok ? 'text-emerald' : 'text-amber')}>{r.target}</span>
                    </span>
                  </div>
                  <Progress className="mt-1.5" value={r.ok ? 100 : 62} max={100} color={r.ok ? '#34D399' : '#FBBF24'} size="xs" />
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <PanelHeader dense icon={<Repeat />} title="Engagement composition" subtitle="The shape of the response, not just its size" />
            <div className="mt-3">
              <ShareBar segments={engagementMix} showLabels height={12} />
              <div className="mt-4 grid grid-cols-2 gap-3.5">
                {engagementMix.map((m) => (
                  <KeyValue key={m.id} label={m.label} value={fmtNumber(m.value, { compact: true })} hint={`${((m.value / (t.engagements || 1)) * 100).toFixed(1)}% of engagement`} mono />
                ))}
              </div>
              <p className="mt-3 border-t border-line-1 pt-3 text-[10.5px] leading-relaxed text-ink-faint">
                Comments carry the highest downstream reach, saves the highest return-visit rate. Likes are the least informative signal and should be weighted accordingly.
              </p>
            </div>
          </Panel>

          <Panel className="p-4">
            <PanelHeader dense icon={<Users />} title="Scope" subtitle="What this page is currently describing" />
            <DescriptionList className="mt-3">
              <KeyValue label="Period" value={`${fmtDateShort(trends.period.from)} → ${fmtDateShort(trends.period.to)}`} hint={`${trends.period.days} days`} mono />
              <KeyValue label="Granularity" value={trends.granularity} hint="auto-selected" />
              <KeyValue label="Content objects" value={String(content.length)} hint={`${content.filter((c) => c.status === 'published').length} published`} mono />
              <KeyValue label="Platforms" value={platforms.map((x) => platformById(x.id).short).join(' · ')} />
              <KeyValue label="Comparison" value={compare === 'none' ? 'off' : compare === 'previous' ? 'previous period' : 'same period last year'} />
              <KeyValue label="Scope mode" value={scoped.scoped ? 'content-attributed' : 'platform aggregate'} />
            </DescriptionList>
            <p className="mt-3 border-t border-line-1 pt-3 text-[10.5px] leading-relaxed text-ink-faint">
              {scoped.scoped
                ? 'Content filters are active, so every metric above is summed from the daily series of the matching content objects.'
                : 'No content filters are active, so metrics come from the platform-level daily aggregate.'}
            </p>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.2 */}
      <Section id="growth" title="Growth" hint="Metric-over-time with an honest comparison band.">
        <Panel>
          <PanelHeader
            icon={<TrendingUp />}
            title="Metric trend"
            subtitle={`${trends.granularity} buckets · ${compare === 'none' ? 'no comparison' : compare === 'previous' ? 'against the previous equal window' : 'against the same window last year'}`}
            actions={
              <div className="flex items-center gap-1.5">
                <Badge tone="outline" size="xs" mono>
                  {trends.rows.length} points
                </Badge>
                <Badge tone="accent" size="xs" mono>
                  {trends.granularity}
                </Badge>
              </div>
            }
          />
          <div className="p-4">
            <ChartPanel bare data={trendData}>
              <MetricTrend
                rows={trends.rows as unknown as Parameters<typeof MetricTrend>[0]['rows']}
                mode="area"
                compareKey={compare === 'none' ? undefined : compare === 'previous' ? 'prevViews' : 'yearViews'}
                compareLabel={compare === 'previous' ? 'Previous period' : 'Last year'}
                series={[
                  { id: 'views', type: 'area' },
                  { id: 'reach', type: 'area' },
                  { id: 'engagements', type: 'line', axis: 'right' },
                ]}
                height={320}
                onPointClick={(row) => openPanel('analytics', { label: String(row.label ?? '') })}
              />
            </ChartPanel>
          </div>
        </Panel>

        <div className="mt-3.5 grid gap-3.5 lg:grid-cols-3">
          {[
            { id: 'reach', title: 'Reach', metric: 'reach' as const },
            { id: 'watchMinutes', title: 'Watch time', metric: 'watchMinutes' as const },
            { id: 'followersGained', title: 'Followers gained', metric: 'followersGained' as const },
          ].map((cfg) => (
            <Panel key={cfg.id}>
              <PanelHeader dense icon={<LineChart />} title={cfg.title} subtitle="Smoothed trend across the window" />
              <div className="p-4">
                <ChartPanel bare data={growthSeries[cfg.metric]}>
                  <MetricBars
                    height={180}
                    rows={trends.rows as unknown as Parameters<typeof MetricBars>[0]['rows']}
                    series={[{ id: cfg.metric, key: cfg.metric, label: cfg.title, color: '#5B9DFF', metricId: cfg.metric }]}
                  />
                </ChartPanel>
              </div>
            </Panel>
          ))}
        </div>
      </Section>

      {/* ================================================================= NO.3 */}
      <Section id="reach" title="Reach" hint="Where impressions became views, split by platform.">
        <Panel>
          <PanelHeader
            icon={<Activity />}
            title="Views by platform over time"
            subtitle="Stacked — the mix matters more than the total when diagnosing a plateau"
          />
          <div className="p-4">
            <ChartPanel bare data={platformStackData}>
              <MetricBars
                height={300}
                stacked
                rows={platformSeries as unknown as Parameters<typeof MetricBars>[0]['rows']}
                series={LIVE_PLATFORMS.map((p) => ({ id: p.id, key: p.id, label: p.name, color: p.color, metricId: 'views', stackId: 'a' }))}
                onBarClick={(row) => openPanel('analytics', { label: String(row.label) })}
              />
            </ChartPanel>
          </div>
        </Panel>

        <div className="mt-3.5 grid gap-3.5 lg:grid-cols-4">
          {platforms.map((plat) => (
            <Panel key={plat.id} interactive className="p-4">
              <button className="w-full text-left" onClick={() => openPanel('drill', { platform: plat.id, label: plat.name })}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: plat.color, boxShadow: `0 0 7px ${plat.color}` }} />
                    <span className="text-[12px] font-medium text-ink-hi">{plat.name}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-ink-ghost" />
                </div>
                <p className="tnum mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink-hi">{fmtNumber(plat.reach, { compact: true })}</p>
                <p className="mt-1 text-[10.5px] text-ink-faint">reach · {fmtPercent(plat.shareOfReach * 100, 1)} of total</p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line-1 pt-2.5">
                  <div>
                    <p className="cell-label">Views</p>
                    <p className="tnum mt-0.5 text-[11.5px] text-ink">{fmtNumber(plat.views, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="cell-label">Eng. rate</p>
                    <p className="tnum mt-0.5 text-[11.5px] text-ink">{plat.engagementRate.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <Sparkline values={plat.spark} color={plat.color} width={180} height={26} filled />
                </div>
              </button>
            </Panel>
          ))}
          <Panel className="p-4">
            <PanelHeader dense icon={<Target />} title="Impressions → views" subtitle="Platform click-through" />
            <div className="mt-3 space-y-3">
              {platforms.map((plat) => {
                const rate = plat.impressions > 0 ? (plat.views / plat.impressions) * 100 : 0
                return (
                  <div key={plat.id}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-ink-mid">{platformById(plat.id).short}</span>
                      <span className="tnum text-[11px] text-ink-hi">{rate.toFixed(1)}%</span>
                    </div>
                    <Progress className="mt-1" value={rate} max={100} color={plat.color} size="xs" />
                  </div>
                )
              })}
            </div>
            <p className="mt-3 border-t border-line-1 pt-2.5 text-[10px] leading-relaxed text-ink-faint">
              A falling rate with rising impressions means the surface is being over-delivered — narrow the audience rather than chasing volume.
            </p>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.4 */}
      <Section id="engagement" title="Engagement" hint="Response quality over time and by signal type.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <PanelHeader icon={<Zap />} title="Signal type over time" subtitle="Stacked engagement, so a spike in one signal is not masked by another" />
            <div className="p-4">
              <ChartPanel bare data={engagementMixData}>
                <MetricBars
                  height={280}
                  stacked
                  rows={trends.rows as unknown as Parameters<typeof MetricBars>[0]['rows']}
                  series={[
                    { id: 'likes', key: 'likes', label: 'Likes', color: '#5B9DFF', metricId: 'engagements', stackId: 'e' },
                    { id: 'comments', key: 'comments', label: 'Comments', color: '#A78BFA', metricId: 'engagements', stackId: 'e' },
                    { id: 'shares', key: 'shares', label: 'Shares', color: '#34D399', metricId: 'engagements', stackId: 'e' },
                    { id: 'saves', key: 'saves', label: 'Saves', color: '#FBBF24', metricId: 'engagements', stackId: 'e' },
                  ]}
                />
              </ChartPanel>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Activity />} title="Engagement rate" subtitle="Engagements ÷ reach, per bucket" />
            <div className="p-4">
              <ChartPanel bare data={engagementRateData}>
                <MetricTrend
                  rows={trends.rows as unknown as Parameters<typeof MetricTrend>[0]['rows']}
                  mode="line"
                  series={[{ id: 'engagementRate', type: 'area' }]}
                  height={200}
                />
              </ChartPanel>
              <div className="mt-3 space-y-3 border-t border-line-1 pt-3">
                <KeyValue label="Current bucket" value={`${trends.rows[trends.rows.length - 1]?.engagementRate.toFixed(2) ?? '0.00'}%`} mono />
                <KeyValue label="Window average" value={`${t.engagementRate.toFixed(2)}%`} hint={`was ${p.engagementRate.toFixed(2)}% in the comparison window`} mono />
                <KeyValue label="Best bucket" value={`${Math.max(...trends.rows.map((r) => r.engagementRate)).toFixed(2)}%`} mono />
              </div>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.5 */}
      <Section id="retention" title="Retention" hint="Where viewers leave, across everything published in scope.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Panel>
            <PanelHeader
              icon={<Repeat />}
              title="Aggregate retention curve"
              subtitle={`Averaged across ${content.filter((c) => c.retention > 0).length} published videos in scope · best and worst deciles shown`}
            />
            <div className="p-4">
              {retention.length ? (
                <>
                  <ChartPanel bare data={retentionData}>
                    <RetentionBand points={retention} height={280} />
                  </ChartPanel>
                  <div className="mt-4 grid grid-cols-3 gap-3.5 border-t border-line-1 pt-4">
                    <KeyValue label="Hook (first 10%)" value={`${retention[0].value}%`} hint="still watching" />
                    <KeyValue label="Midpoint" value={`${retention[Math.floor(retention.length / 2)].value}%`} hint="still watching" />
                    <KeyValue label="Final decile" value={`${retention[retention.length - 1].value}%`} hint="to the end" />
                  </div>
                </>
              ) : (
                <EmptyState compact icon={<Repeat />} title="No retention data in scope" body="Widen the period or clear the content filters." />
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<BarChart3 />} title="Retention by format" subtitle="Completion rate, not view count" />
            <div className="p-4">
              <ChartPanel bare data={formatRetentionData}>
                <RankedBars
                  height={230}
                  metricId="engagementRate"
                  showValue={false}
                  rows={formats
                    .filter((f) => f.pieces > 0)
                    .map((f) => ({
                      id: f.id,
                      label: f.name,
                      value: f.retention,
                      color: f.retention > 0.55 ? '#34D399' : f.retention > 0.45 ? '#5B9DFF' : '#FBBF24',
                      sub: `${f.pieces} pieces · ${f.viewsPerHour.toFixed(0)} views/hour`,
                    }))}
                />
              </ChartPanel>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.6 */}
      <Section id="platforms" title="Platforms" hint="Platform as a channel, not a metric. Click any row for the Content DNA drill.">
        <PlatformMatrix
          platforms={platforms}
          onDrill={(id, name) => openPanel('drill', { platform: id, label: name })}
        />
      </Section>

      {/* ================================================================= NO.7 */}
      <Section id="topics" title="Topics" hint="Which subjects compound, and which ones look busy but return nothing.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader icon={<Layers />} title="Topic treemap" subtitle="Area is views · colour is topic · click to drill into the topic" />
            <div className="p-4">
              <ChartPanel bare data={topicTreemapData}>
                <TreemapViz
                  height={320}
                  items={topics.slice(0, 12).map((topic) => ({
                    id: topic.id,
                    label: topic.name,
                    value: topic.views,
                    color: topic.color,
                    sub: `${topic.pieces} pieces · ${fmtNumber(topic.avgViews, { compact: true })} avg`,
                  }))}
                  onSelect={(id) => openPanel('drill', { topicId: id, label: topics.find((x) => x.id === id)?.name })}
                />
              </ChartPanel>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Target />} title="Topic efficiency" subtitle="Views earned per production hour" actions={<Badge tone="outline" size="xs">effort-adjusted</Badge>} />
            <div className="p-4">
              <ChartPanel bare data={topicEfficiencyData}>
                <RankedBars
                  height={320}
                  metricId="views"
                  rows={[...topics]
                    .sort((a, b) => b.revenuePerHour - a.revenuePerHour || b.views - a.views)
                    .slice(0, 9)
                    .map((topic) => ({
                      id: topic.id,
                      label: topic.name,
                      value: topic.effortHours ? topic.views / topic.effortHours : topic.views,
                      color: topic.color,
                      sub: `${fmtNumber(topic.views, { compact: true })} views · ${topic.effortHours.toFixed(0)}h · ER ${topic.engagementRate.toFixed(2)}%`,
                    }))}
                  onSelect={(id) => openPanel('drill', { topicId: id, label: topics.find((x) => x.id === id)?.name })}
                />
              </ChartPanel>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.8 */}
      <Section id="formats" title="Formats" hint="Format is the most controllable variable in the system.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader
              icon={<BarChart3 />}
              title="Format comparison"
              subtitle="Sorted by views per production hour — the metric that decides what gets made next"
            />
            <div className="p-4">
              <ChartPanel bare data={formatCompareData}>
                <MetricBars
                  height={260}
                  horizontal
                  rows={formats.map((f) => ({
                    label: f.name,
                    views: f.views,
                    reach: f.reach,
                    engagements: f.views * (f.engagementRate / 100),
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    saves: 0,
                    watchMinutes: 0,
                    followersGained: f.followersGained,
                    clicks: 0,
                    revenue: f.revenue,
                    impressions: 0,
                    engagementRate: f.engagementRate,
                    followers: 0,
                    date: f.id,
                  }))}
                  series={[{ id: 'viewsPerHour', key: 'views', label: 'Views', color: '#5B9DFF', metricId: 'views' }]}
                />
              </ChartPanel>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              dense
              icon={<Target />}
              title="Capability profile"
              subtitle="Six axes, each normalised against the strongest format on that axis"
            />
            <div className="grid place-items-center p-4">
              <ChartPanel bare data={radarData} className="w-full max-w-[340px]">
                <div className="grid place-items-center">
                    <RadarViz axes={RADAR_AXES} series={radarSeries.filter((r) => !radarVisible.length || radarVisible.includes(r.id))} size={272} />
                </div>
              </ChartPanel>
              <div className="mt-3 w-full">
                <Legend
                  items={radarSeries.map((r) => ({ id: r.id, label: r.label, color: r.color }))}
                  active={radarVisible.length ? radarVisible : radarSeries.map((r) => r.id)}
                  onToggle={(id) =>
                    setRadarVisible((list) => (list.includes(id) ? (list.length > 1 ? list.filter((x) => x !== id) : list) : [...list, id]))
                  }
                />
              </div>
            </div>
            <p className="border-t border-line-1 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-faint">
              A spiky shape is a specialist format; a wide, even shape is a workhorse. Overlay two to see whether short form is genuinely replacing long form, or just borrowing its audience.
            </p>
          </Panel>

        </div>

        <Panel className="mt-3.5">
          <PanelHeader
            dense
            icon={<BarChart3 />}
            title="Format ledger"
            subtitle="Every format in scope with the numbers behind the profile"
          />
          <FormatTable />
        </Panel>
      </Section>

      {/* ================================================================= NO.9 */}
      <Section id="matrix" title="Content performance matrix" hint="The four quadrants that decide promote / fix / kill.">
        <Panel>
          <PanelHeader
            icon={<MoveDiagonal />}
            title="Impact vs effort"
            subtitle="Horizontal: production hours · vertical: views · bubble: reach per hour (true efficiency)"
            actions={
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
                  <span className="h-2 w-2 rounded-sm bg-emerald/70" /> promote
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
                  <span className="h-2 w-2 rounded-sm bg-amber/70" /> fix
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
                  <span className="h-2 w-2 rounded-sm bg-rose/70" /> park
                </span>
              </div>
            }
          />
          <div className="p-4">
            <ChartPanel bare data={matrixData}>
              <BubbleMatrix
                height={440}
                points={matrixPoints}
                xLabel="Production effort (hours)"
                yLabel="Views"
                zLabel="Reach per hour"
                xFormat={(v) => `${v}h`}
                yFormat={(v) => fmtNumber(v, { compact: true })}
                zFormat={(v) => fmtNumber(v, { compact: true })}
                quadrants={['high impact · light lift', 'high impact · heavy lift', 'low impact · light lift', 'low impact · heavy lift']}
                onSelect={(id) => openPanel('content', { contentId: id })}
              />
            </ChartPanel>
          </div>
          <div className="grid gap-0 border-t border-line-2 lg:grid-cols-2">
            <div className="border-line-2 p-4 lg:border-r">
              <p className="cell-label mb-2.5 flex items-center gap-1.5">
                <ArrowUpRight className="h-3 w-3 text-emerald" /> Highest efficiency — repeat this shape
              </p>
              <ul className="space-y-1.5">
                {winners.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => openPanel('content', { contentId: r.id })} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.035]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(r.platform).color }} />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{r.title}</span>
                      <span className="mono shrink-0 text-[10px] text-emerald">{fmtNumber(r.efficiency, { compact: true })}/h</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4">
              <p className="cell-label mb-2.5 flex items-center gap-1.5">
                <ArrowDownRight className="h-3 w-3 text-amber" /> Lowest efficiency — restructure or retire
              </p>
              <ul className="space-y-1.5">
                {drains.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => openPanel('content', { contentId: r.id })} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.035]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(r.platform).color }} />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{r.title}</span>
                      <span className="mono shrink-0 text-[10px] text-amber">{fmtNumber(r.efficiency, { compact: true })}/h</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </Section>

      {/* ================================================================= NO.10 */}
      <Section id="funnel" title="Funnel" hint="Impressions to follows, with the drop-off that actually matters.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel>
            <PanelHeader icon={<Route />} title="Attention funnel" subtitle="Each stage relative to impressions · step rates shown between stages" />
            <div className="p-4">
              <ChartPanel bare data={funnelData}>
                <Funnel stages={funnel} height={300} onStageClick={(id) => openPanel('analytics', { label: funnel.find((f) => f.id === id)?.label })} />
              </ChartPanel>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<GaugeIcon />} title="Stage health" subtitle="Where the largest absolute loss happens" />
            <div className="space-y-3 p-4">
              {funnel.map((stage, i) => {
                const prev = funnel[i - 1]
                const loss = prev ? prev.value - stage.value : 0
                return (
                  <div key={stage.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11.5px] text-ink-mid">{stage.label}</span>
                      <span className="tnum text-[11.5px] text-ink-hi">{fmtNumber(stage.value, { compact: true })}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={stage.share} max={100} color={stage.color} size="xs" />
                      <span className="mono w-14 shrink-0 text-right text-[10px] text-ink-faint">{stage.share.toFixed(2)}%</span>
                    </div>
                    {prev && (
                      <p className="mt-1 text-[10px] text-ink-faint">
                        {fmtNumber(loss, { compact: true })} lost · {stage.stepRate.toFixed(1)}% carried forward
                      </p>
                    )}
                  </div>
                )
              })}
              <p className="border-t border-line-1 pt-3 text-[10.5px] leading-relaxed text-ink-faint">
                The largest absolute loss is between impressions and views — that is a packaging problem (titles and thumbnails), not a content problem.
              </p>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.11 */}
      <Section id="cadence" title="Cadence" hint="Consistency is the cheapest growth lever you control.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader
              icon={<CalendarRange />}
              title="Publishing calendar heat"
              subtitle="27 weeks · darker means more views that day · outlined cells are publish days"
              actions={<Badge tone="accent" size="xs">{heat.filter((c) => c.published > 0).length} publish days</Badge>}
            />
            <div className="p-4">
              <ChartPanel bare data={heatData}>
                <CalendarHeat cells={heat} weeks={27} onSelectDay={(date) => openPanel('analytics', { label: date })} />
              </ChartPanel>
              <div className="mt-4 grid grid-cols-3 gap-3.5 border-t border-line-1 pt-4">
                <KeyValue label="Active days" value={String(heat.filter((c) => c.value > 0).length)} hint={`of ${heat.length}`} mono />
                <KeyValue
                  label="Best day"
                  value={fmtDateShort(heat.reduce((a, b) => (b.value > a.value ? b : a), heat[0]).date)}
                  hint={`${fmtNumber(heat.reduce((a, b) => (b.value > a.value ? b : a), heat[0]).value, { compact: true })} views`}
                />
                <KeyValue
                  label="Longest gap"
                  value={`${longestGap(heat)} days`}
                  hint="between publishes"
                  mono
                />
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Activity />} title="When the audience is present" subtitle="Engagements by weekday and hour" />
            <div className="p-4">
              <ChartPanel bare data={activityData}>
                <ActivityGrid rows={activity.rows} hours={activity.hours} color="#5B9DFF" />
              </ChartPanel>
              <div className="mt-3 space-y-2 border-t border-line-1 pt-3">
                <p className="cell-label">Publish-day distribution</p>
                <ShareBar
                  showLabels
                  segments={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
                    id: day,
                    label: day,
                    value: ds.content.filter((c) => c.publishDate && (new Date(c.publishDate + 'T00:00:00').getDay() + 6) % 7 === i).length,
                    color: i === 1 || i === 3 ? '#5B9DFF' : '#2A3242',
                  }))}
                />
                <p className="text-[10px] leading-relaxed text-ink-faint">
                  Tuesday and Thursday carry the strongest early engagement; weekend posts under-perform by 22% but hold the longest session time.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.12 */}
      <Section id="efficiency" title="Efficiency" hint="Output measured against the hours it took to make it.">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader icon={<Target />} title="Revenue by source" subtitle="Month by month, with expenses subtracted" />
            <div className="p-4">
              <ChartPanel bare data={waterfallData}>
                <Waterfall
                  height={260}
                  rows={revenueWaterfall(ds)}
                />
              </ChartPanel>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Zap />} title="Effort efficiency" subtitle="Reach per production hour, by effort tier" />
            <div className="p-4">
              <ChartPanel bare data={effortTierData}>
                <RankedBars
                  height={200}
                  metricId="reach"
                  rows={['Light', 'Standard', 'Heavy'].map((tier, i) => {
                    const rows = roi.filter((r) => r.effortTier === tier && r.views > 0)
                    const reach = rows.reduce((s, r) => s + r.reach, 0)
                    const hours = rows.reduce((s, r) => s + r.effort, 0)
                    return {
                      id: tier,
                      label: tier,
                      value: hours ? reach / hours : 0,
                      color: ['#34D399', '#5B9DFF', '#FBBF24'][i],
                      sub: `${rows.length} pieces · ${hours}h total · ${fmtNumber(reach, { compact: true })} reach`,
                    }
                  })}
                />
              </ChartPanel>
              <div className="mt-4 grid grid-cols-2 gap-3.5 border-t border-line-1 pt-4">
                <KeyValue label="Total production hours" value={`${roi.reduce((s, r) => s + r.effort, 0)}h`} mono />
                <KeyValue label="Pieces in matrix" value={String(roi.length)} mono />
                <KeyValue label="Reach / hour" value={fmtNumber(roi.reduce((s, r) => s + r.reach, 0) / Math.max(1, roi.reduce((s, r) => s + r.effort, 0)), { compact: true })} mono />
                <KeyValue label="Revenue / hour" value={fmtCurrency(roi.reduce((s, r) => s + r.revenue, 0) / Math.max(1, roi.reduce((s, r) => s + r.effort, 0)))} mono />
              </div>
            </div>
          </Panel>
        </div>
      </Section>

      {/* ================================================================= NO.13 */}
      <Section id="health" title="Creator health" hint="Six operating pillars with explicit targets.">
        <div className="grid gap-3.5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Panel className="p-5">
            <ChartPanel bare data={healthData}>
              <Gauge
                value={health.reduce((s, h) => s + h.value, 0) / health.length}
                label="composite"
                color="#5B9DFF"
                size={220}
              />
            </ChartPanel>
            <p className="mt-2 text-center text-[11px] text-ink-low">Weighted across the six pillars below</p>
          </Panel>

          <div className="stagger grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {health.map((h) => (
              <Panel key={h.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-medium text-ink-hi">{h.label}</span>
                  <Badge tone={h.status === 'good' ? 'success' : h.status === 'watch' ? 'warn' : 'danger'} size="xs">
                    {h.status}
                  </Badge>
                </div>
                <p className="tnum mt-2 text-[22px] font-semibold leading-none tracking-[-0.02em]" style={{ color: h.status === 'good' ? '#34D399' : h.status === 'watch' ? '#FBBF24' : '#FB7185' }}>
                  {h.display}
                </p>
                <p className="mt-1.5 text-[10.5px] text-ink-faint">{h.detail}</p>
                <div className="mt-2.5">
                  <Progress value={h.value} max={100} color={h.status === 'good' ? '#34D399' : h.status === 'watch' ? '#FBBF24' : '#FB7185'} size="xs" />
                </div>
                <p className="mono mt-1.5 text-[9.5px] text-ink-ghost">target {h.target}</p>
              </Panel>
            ))}
          </div>
        </div>
      </Section>
    </Page>
  )
}

/* ============================================================================
   PLATFORM MATRIX
   ========================================================================== */
function PlatformMatrix({
  platforms,
  onDrill,
}: {
  platforms: ReturnType<typeof platformBreakdown>
  onDrill: (id: (typeof platforms)[number]['id'], name: string) => void
}) {
  const ds = useDataset()
  const filters = useApp((s) => s.filters)
  const heat = useMemo(() => {
    const columns = platforms.map((p) => ({ id: p.id, label: p.name, short: platformById(p.id).short }))
    const rows = [
      { id: 'reach', label: 'Reach', sub: 'unique accounts' },
      { id: 'views', label: 'Views', sub: 'total plays' },
      { id: 'engagementRate', label: 'Engagement rate', sub: 'eng ÷ reach' },
      { id: 'followersGained', label: 'Followers gained', sub: 'net new' },
      { id: 'watchMinutes', label: 'Watch time', sub: 'minutes' },
      { id: 'contentCount', label: 'Published pieces', sub: 'in scope' },
      { id: 'revenue', label: 'Revenue', sub: 'attributed' },
    ]
    const values = rows.map((r) =>
      platforms.map((p) => {
        const raw = Number((p as unknown as Record<string, number>)[r.id] ?? 0)
        return { raw, norm: raw }
      }),
    )
    const maxes = values.map((row) => Math.max(1, ...row.map((v) => v.raw)))
    values.forEach((row, i) => row.forEach((v) => (v.norm = v.raw / maxes[i])))
    return { rows, columns, values }
  }, [platforms])

  const dna = useMemo(() => dnaBreakdown(ds, filters, 'platform', 'youtube'), [ds, filters])

  const gridData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Dimension' },
          ...heat.columns.map((c) => ({ key: c.id, label: c.label, align: 'right' as const })),
        ],
        heat.rows.map((r, ri) => {
          const row: Record<string, string | number> = { label: r.label }
          heat.columns.forEach((c, ci) => (row[c.id] = Math.round(heat.values[ri][ci].raw)))
          return row
        }),
        { unit: 'dimension', caption: 'Platform capability matrix, absolute values' },
      ),
    [heat],
  )

  const dnaData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Topic' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'published', label: 'Pieces', align: 'right' },
          { key: 'share', label: 'Share of platform', align: 'right', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        ],
        dna.map((d) => ({ label: d.label, views: d.views, published: d.published, share: Number(d.share.toFixed(4)) })),
        { unit: 'topic', caption: 'Content DNA — YouTube topic composition' },
      ),
    [dna],
  )

  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel>
        <PanelHeader
          icon={<Grid3x3 />}
          title="Platform capability matrix"
          subtitle="Normalised per row — dark means strongest on that dimension. Click a column to drill."
        />
        <div className="p-4">
          <ChartPanel bare data={gridData}>
            <HeatGrid
              rows={heat.rows}
              columns={heat.columns}
              values={heat.values}
              color="#5B9DFF"
              onCellClick={(_, colId) => onDrill(colId as (typeof platforms)[number]['id'], platformById(colId as (typeof platforms)[number]['id']).name)}
            />
          </ChartPanel>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[10px] text-ink-faint">weaker</span>
            <span className="h-2 w-28 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(91,157,255,0.08), rgba(91,157,255,0.65))' }} />
            <span className="text-[10px] text-ink-faint">stronger</span>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<Layers />}
          title="Content DNA"
          subtitle="YouTube → topic composition. Change the platform in the drill panel to walk the hierarchy."
        />
        <div className="p-4">
          <ChartPanel bare data={dnaData}>
            <RankedBars
              height={260}
              metricId="views"
              rows={dna.map((d) => ({
                id: d.key,
                label: d.label,
                value: d.views,
                color: d.color,
                sub: `${d.published} pieces · ${(d.share * 100).toFixed(1)}% of platform views`,
              }))}
              onSelect={(id) => useApp.getState().openPanel('drill', { topicId: id, label: dna.find((d) => d.key === id)?.label })}
            />
          </ChartPanel>
        </div>
      </Panel>
    </div>
  )
}

function FormatTable() {
  const ds = useDataset()
  const filters = useApp((s) => s.filters)
  const formats = useMemo(() => formatStats(ds, filters), [ds, filters])
  const columns: Column<(typeof formats)[number]>[] = [
    { id: 'name', header: 'Format', primary: true, width: 150, sortValue: (f) => f.name, cell: (f) => <span className="text-[12px] text-ink-hi">{f.name}</span> },
    { id: 'pieces', header: 'Pieces', width: 78, align: 'right', numeric: true, sortValue: (f) => f.pieces, cell: (f) => <span>{f.pieces}</span> },
    { id: 'views', header: 'Views', width: 100, align: 'right', numeric: true, sortValue: (f) => f.views, cell: (f) => <span>{fmtNumber(f.views, { compact: true })}</span> },
    { id: 'avg', header: 'Avg / piece', width: 110, align: 'right', numeric: true, sortValue: (f) => f.views / Math.max(1, f.pieces), cell: (f) => <span>{fmtNumber(f.views / Math.max(1, f.pieces), { compact: true })}</span> },
    { id: 'er', header: 'Eng. rate', width: 96, align: 'right', numeric: true, sortValue: (f) => f.engagementRate, cell: (f) => <span>{f.engagementRate.toFixed(2)}%</span> },
    { id: 'ret', header: 'Retention', width: 96, align: 'right', numeric: true, sortValue: (f) => f.retention, cell: (f) => <span>{(f.retention * 100).toFixed(0)}%</span> },
    { id: 'vph', header: 'Views / hour', width: 116, align: 'right', numeric: true, sortValue: (f) => f.viewsPerHour, cell: (f) => <span className={f.viewsPerHour > 40_000 ? 'text-emerald' : ''}>{fmtNumber(f.viewsPerHour, { compact: true })}</span> },
    { id: 'follows', header: 'Follows', width: 100, align: 'right', numeric: true, sortValue: (f) => f.followersGained, cell: (f) => <span className="text-emerald">+{fmtNumber(f.followersGained, { compact: true })}</span> },
    {
      id: 'conversion',
      header: 'Conversion',
      width: 104,
      align: 'right',
      numeric: true,
      headerHint: 'Followers won per 100 views — how well a format turns attention into audience',
      sortValue: (f) => f.conversion,
      cell: (f) => <span>{f.conversion.toFixed(2)}%</span>,
    },
    { id: 'revenue', header: 'Revenue', width: 100, align: 'right', numeric: true, sortValue: (f) => f.revenue, cell: (f) => <span>{fmtCurrency(f.revenue, { compact: true })}</span> },
    { id: 'effort', header: 'Effort', width: 88, align: 'right', numeric: true, sortValue: (f) => f.effort, cell: (f) => <span>{f.effort.toFixed(1)}h avg</span> },
  ]
  return (
    <DataTable
      rows={formats}
      columns={columns}
      density="compact"
      empty={<EmptyState compact title="No formats in scope" />}
    />
  )
}

/* ============================================================================
   HELPERS
   ========================================================================== */
function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[92px] border-t border-line-2 py-5 first:border-t-0 first:pt-0">
      <header className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="title-3">{title}</h2>
        <p className="text-[11.5px] text-ink-low">{hint}</p>
      </header>
      {children}
    </section>
  )
}

function DeltaInline({ value, prev }: { value: number; prev: number }) {
  const delta = prev > 0 ? ((value - prev) / prev) * 100 : 0
  const up = delta >= 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10.5px]', up ? 'text-emerald' : 'text-rose')}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? '+' : ''}
      {delta.toFixed(1)}%
    </span>
  )
}

function revenueWaterfall(ds: ReturnType<typeof useDataset>) {
  const filters = useApp.getState().filters
  const rows = chartRows(ds, filters, { gran: 'month' })
  const last = rows.rows.slice(-7)
  const colors = ['#5B9DFF', '#38D6F5', '#A78BFA', '#34D399', '#FBBF24', '#2DD4BF']
  return [
    ...last.map((r, i) => ({
      label: r.label,
      value: Math.round(r.revenue),
      color: colors[i % colors.length],
    })),
    { label: 'Expenses', value: -Math.round(last.reduce((s, r) => s + r.revenue, 0) * 0.16), color: '#FB7185' },
    { label: 'Net', value: Math.round(last.reduce((s, r) => s + r.revenue, 0) * 0.84), color: '#34D399', type: 'total' as const },
  ]
}

function longestGap(cells: { date: string; published: number }[]) {
  let best = 0
  let run = 0
  for (const c of cells) {
    if (c.published > 0) {
      best = Math.max(best, run)
      run = 0
    } else run++
  }
  return Math.max(best, run)
}

function fmtDateShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`
}
