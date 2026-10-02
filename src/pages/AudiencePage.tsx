import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { LIVE_PLATFORMS, platformById } from '@/data/registry'
import { fmtNumber, fmtPercent } from '@/lib/format'
import { activityProfile, audienceByPlatform, audienceTimeline, cohortRetention, growthCohorts, scopedTotals } from '@/analytics/queries'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Skeleton } from '@/components/ui/Surface'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Segmented } from '@/components/ui/Field'
import { FilterBar } from '@/components/shell/FilterBar'
import { MetricTrend } from '@/components/charts/LineArea'
import { ShareBar, RankedBars, MetricBars } from '@/components/charts/Bars'
import { ActivityGrid, Gauge } from '@/components/charts/Special'
import { MetricCard, MetricHero } from '@/components/metrics/MetricCard'

/* ============================================================================
   AUDIENCE
   Deliberately restrained: who they are, where they came from, and when they
   pay attention. No vanity duplicates of the analytics page.
   ========================================================================== */

export function AudiencePage() {
  const ds = useDataset()
  const settled = useSettled(200)
  const filters = useApp((s) => s.filters)
  const [metric, setMetric] = useState<'followers' | 'followersGained'>('followers')

  const perPlatform = useMemo(() => audienceByPlatform(ds, filters), [ds, filters])
  const timeline = useMemo(() => audienceTimeline(ds, filters), [ds, filters])
  const cohorts = useMemo(() => cohortRetention(ds, filters), [ds, filters])
  const weekly = useMemo(() => growthCohorts(ds, filters), [ds, filters])
  const activity = useMemo(() => activityProfile(ds, filters), [ds, filters])
  const totals = useMemo(() => scopedTotals(ds, filters), [ds, filters])

  const totalFollowers = perPlatform.reduce((s, p) => s + p.followers, 0)
  const gained = perPlatform.reduce((s, p) => s + p.gained, 0)
  const lost = perPlatform.reduce((s, p) => s + p.lost, 0)
  const returning = perPlatform.reduce((s, p) => s + p.returningShare * p.followers, 0) / (totalFollowers || 1)

  if (!settled) {
    return (
      <Page width="wide">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-[420px]" />
        <Skeleton className="mt-5 h-[420px] rounded-xl" />
      </Page>
    )
  }

  const bestWindow = activity.rows.reduce(
    (best, row) => {
      row.values.forEach((v, i) => {
        if (v > best.value) best = { value: v, day: row.day, hour: activity.hours[i] }
      })
      return best
    },
    { value: 0, day: 'Tue', hour: 19 },
  )

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Audience"
        title="Audience"
        description="The people behind the numbers: where they came from, what they return for, and the two windows a week when they are actually listening."
        meta={<FilterBar />}
      />

      <div className="mb-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard metricId="followers" value={totalFollowers} context={`across ${perPlatform.length} live platforms`} size="lg" />
        <MetricCard metricId="followersGained" value={gained} context={`${fmtNumber(lost)} unfollows · net ${fmtNumber(gained - lost)}`} color="#34D399" />
        <MetricCard
          metricId="engagementRate"
          value={totals.totals.engagementRate}
          context={`${fmtNumber(totals.totals.engagements)} engagements in scope`}
        />
        <Panel className="p-4">
          <MetricHero label="Returning share" value={`${(returning * 100).toFixed(1)}%`} color="#A78BFA" />
          <p className="mt-2 text-[10.5px] text-ink-faint">viewers who had seen you before — the strongest predictor of durable growth</p>
        </Panel>
      </div>

      <SplitGrid ratio="wide" className="mb-3.5">
        <Panel>
          <PanelHeader
            icon={<Users />}
            title="Audience growth"
            subtitle={metric === 'followers' ? 'Total followers across platforms' : 'New followers per day'}
            actions={
              <Segmented
                size="sm"
                ariaLabel="Growth metric"
                value={metric}
                onChange={setMetric}
                options={[
                  { id: 'followers', label: 'Total' },
                  { id: 'followersGained', label: 'New' },
                ]}
              />
            }
          />
          <div className="p-4">
            <MetricTrend
              rows={timeline as unknown as Parameters<typeof MetricTrend>[0]['rows']}
              mode="stacked"
              series={[{ id: metric, type: 'area', key: metric, label: 'Total audience' }]}
              height={250}
            />
            <p className="mt-2 text-[10.5px] text-ink-faint">
              Stacked by platform. The visible steps are publish days — replays arrive within 36 hours of a release.
            </p>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <PanelHeader dense icon={<Users />} title="By platform" subtitle="Composition of your audience" />
            <div className="space-y-3 p-3.5">
              <ShareBar
                segments={perPlatform.map((p) => ({ id: p.platform, label: platformById(p.platform).name, value: p.followers, color: platformById(p.platform).color }))}
                showLabels
              />
              <div className="space-y-2 border-t border-line-1 pt-3">
                {perPlatform.map((p) => (
                  <div key={p.platform} className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(p.platform).color }} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{platformById(p.platform).name}</span>
                    <span className="tnum shrink-0 text-[11.5px] text-ink-hi">{fmtNumber(p.followers, { compact: true })}</span>
                    <span className={cn('tnum w-16 shrink-0 text-right text-[10.5px]', p.net >= 0 ? 'text-emerald' : 'text-rose')}>
                      {p.net >= 0 ? '+' : ''}
                      {fmtNumber(p.net, { compact: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Users />} title="Retention signal" subtitle="How much of the audience keeps coming back" />
            <div className="grid grid-cols-2 gap-3 p-3.5">
              <div className="flex flex-col items-center justify-center">
                <Gauge value={returning * 100} label="returning" color="#A78BFA" size={140} />
              </div>
              <div className="space-y-3">
                <KeyValue label="New in scope" value={fmtNumber(gained)} hint="followers gained" mono />
                <KeyValue label="Unfollows" value={fmtNumber(lost)} hint="churn" mono />
                <KeyValue label="Net" value={`${gained - lost >= 0 ? '+' : ''}${fmtNumber(gained - lost)}`} hint="net change" mono />
                <KeyValue label="Avg per day" value={fmtNumber(Math.round(gained / Math.max(1, timeline.length)))} hint="acquisition pace" mono />
              </div>
            </div>
          </Panel>
        </div>
      </SplitGrid>

      <SplitGrid ratio="wide">
        <Panel>
          <PanelHeader
            icon={<Users />}
            title="When they listen"
            subtitle={`Peak window: ${bestWindow.day} around ${`${bestWindow.hour}`.padStart(2, '0')}:00 — schedule publishing two hours before it`}
            actions={<Badge tone="accent" size="xs">engagement index</Badge>}
          />
          <div className="p-4">
            <ActivityGrid rows={activity.rows} hours={activity.hours} color="#5B9DFF" />
            <div className="mt-4 grid gap-3.5 border-t border-line-1 pt-4 sm:grid-cols-2">
              <div>
                <p className="cell-label mb-2">By weekday</p>
                <MetricBars
                  height={150}
                  rows={activity.rows.map((r, i) => ({
                    label: r.day,
                    value: r.values.reduce((s, v) => s + v, 0),
                    engagements: r.values.reduce((s, v) => s + v, 0),
                    views: 0,
                    reach: 0,
                    impressions: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    saves: 0,
                    watchMinutes: 0,
                    followersGained: 0,
                    clicks: 0,
                    revenue: 0,
                    engagementRate: 0,
                    followers: 0,
                    date: `d${i}`,
                    id: r.day,
                  }))}
                  series={[{ id: 'engagements', key: 'engagements', label: 'Engagements', color: '#5B9DFF', metricId: 'engagements' }]}
                />
              </div>
              <div>
                <p className="cell-label mb-2">New followers by week</p>
                <MetricBars
                  height={150}
                  rows={weekly.map((w) => ({
                    label: w.label,
                    value: w.net,
                    engagements: 0,
                    views: 0,
                    reach: 0,
                    impressions: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    saves: 0,
                    watchMinutes: 0,
                    followersGained: w.gained,
                    clicks: 0,
                    revenue: 0,
                    engagementRate: 0,
                    followers: 0,
                    date: w.start,
                    id: w.start,
                  }))}
                  series={[{ id: 'followersGained', key: 'followersGained', label: 'Gained', color: '#34D399', metricId: 'followersGained' }]}
                />
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <PanelHeader dense icon={<Users />} title="Age" subtitle="Share of audience" />
            <div className="space-y-2.5 p-3.5">
              {ds.demographics.ages.map((a) => (
                <div key={a.bucket} className="flex items-center gap-3">
                  <span className="mono w-12 shrink-0 text-[10.5px] text-ink-mid">{a.bucket}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-accent/80" style={{ width: `${(a.share / 50) * 100}%` }} />
                  </span>
                  <span className="tnum w-10 shrink-0 text-right text-[10.5px] text-ink-hi">{a.share.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Users />} title="Device & format" />
            <div className="space-y-3 p-3.5">
              <ShareBar
                segments={ds.demographics.device.map((d, i) => ({
                  id: d.label,
                  label: d.label,
                  value: d.share,
                  color: ['#5B9DFF', '#38D6F5', '#A78BFA', '#34D399'][i % 4],
                }))}
                showLabels
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Users />} title="Top geographies" subtitle="By follower share" />
            <div className="p-3.5">
              <RankedBars
                height={200}
                metricId="followers"
                rows={ds.demographics.geo.slice(0, 8).map((g, i) => ({
                  id: g.code,
                  label: `${g.country}`,
                  value: g.followers,
                  color: i === 0 ? '#5B9DFF' : '#38D6F5',
                  sub: `${g.share.toFixed(1)}% of audience`,
                }))}
              />
            </div>
          </Panel>
        </div>
      </SplitGrid>

      <Panel className="mt-3.5">
        <PanelHeader
          icon={<Users />}
          title="Cohort return rates"
          subtitle="Each row is an acquisition week. Values are the share of that cohort still engaging N weeks later — stabilising cohorts mean the audience is becoming habitual, not just larger."
        />
        <div className="overflow-x-auto p-4">
          <table className="w-full border-separate border-spacing-[3px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-panel pr-3 text-left">
                  <span className="cell-label">Cohort</span>
                </th>
                <th className="w-16 pr-2 text-right">
                  <span className="cell-label">Size</span>
                </th>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="w-16">
                    <span className="cell-label">W{i}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((row) => (
                <tr key={row.week}>
                  <td className="sticky left-0 z-10 bg-panel pr-3">
                    <span className="mono text-[10.5px] text-ink-mid">{row.label}</span>
                  </td>
                  <td className="pr-2 text-right">
                    <span className="tnum text-[10.5px] text-ink-faint">{fmtNumber(row.size, { compact: true })}</span>
                  </td>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const v = row.values[i]
                    if (v === null || v === undefined) {
                      return (
                        <td key={i}>
                          <span className="block h-[26px] rounded-[5px] border border-dashed border-line-1" />
                        </td>
                      )
                    }
                    return (
                      <td key={i}>
                        <span
                          className="block h-[26px] rounded-[5px] transition-transform duration-200 hover:scale-[1.04]"
                          style={{ background: `rgba(91,157,255,${0.08 + v * 0.62})` }}
                          title={`${fmtPercent(v * 100, 1)} still returning`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
              {!cohorts.length && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState compact icon={<Users />} title="No cohort data in this window" body="Widen the period to see weekly cohorts." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[10px] text-ink-faint">lower</span>
            <span className="h-2 w-32 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(91,157,255,0.12), rgba(91,157,255,0.7))' }} />
            <span className="text-[10px] text-ink-faint">higher return rate</span>
            <span className="mono ml-auto text-[10px] text-ink-ghost">{fmtNumber(totalFollowers)} total audience</span>
          </div>
        </div>
      </Panel>
    </Page>
  )
}
