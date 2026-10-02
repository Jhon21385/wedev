import { buildDataset } from '../src/data/seed/dataset'
import { resolvePeriod } from '../src/analytics/periods'
import { aggregate, samplesIn, contentRows, platformBreakdown, topicStats, formatStats, pipelineStats, creatorHealth, chartRows, funnelStages, revenueTimeline, dealStats, EMPTY_FILTERS, scopeContent } from '../src/analytics/queries'
import { PIPELINE_STAGES } from '../src/data/registry'

const ds = buildDataset()
const f = { ...EMPTY_FILTERS, period: '30d' as const }
const p = resolvePeriod('30d')
const t = aggregate(samplesIn(ds, p), ds)

const fk = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(0)
console.log('=== 30-DAY TOTALS ===')
console.log('views', fk(t.views), '| reach', fk(t.reach), '| impressions', fk(t.impressions), '| engagements', fk(t.engagements), '| ER', t.engagementRate.toFixed(2) + '%')
console.log('watch', fk(t.watchMinutes), 'min | follows', fk(t.followersGained), '| audience', fk(t.followers), '| revenue', '$' + t.revenue.toFixed(0))

console.log('\n=== PLATFORMS ===')
for (const s of platformBreakdown(ds, f)) console.log(s.id.padEnd(10), 'reach', fk(s.reach).padStart(8), 'ER', s.engagementRate.toFixed(2), 'share', s.shareOfReach.toFixed(1) + '%', 'delta', s.delta.toFixed(1) + '%', 'published', s.publishedCount)

console.log('\n=== TOP CONTENT (30d) ===')
for (const r of contentRows(ds, f).slice(0, 8)) console.log(r.title.slice(0, 46).padEnd(48), fk(r.views).padStart(8), r.engagementRate.toFixed(2) + '%', 'growth', r.growthContribution.toFixed(1) + '%')

console.log('\n=== TOPICS ===')
for (const s of topicStats(ds, f, { topLevelOnly: true })) console.log(s.name.padEnd(20), fk(s.views).padStart(8), 'pieces', String(s.pieces).padStart(3), 'ER', s.engagementRate.toFixed(2))

console.log('\n=== FORMATS ===')
for (const s of formatStats(ds, f)) console.log(s.name.padEnd(14), fk(s.views).padStart(8), 'retention', s.retention.toFixed(0) + '%', 'v/hr', fk(s.viewsPerHour))

console.log('\n=== PIPELINE ===')
for (const s of pipelineStats(ds, PIPELINE_STAGES)) console.log(s.name.padEnd(12), 'count', String(s.count).padStart(3), 'velocity', s.velocity, 'overdue', s.overdue, 'stalled', s.stalled)

console.log('\n=== HEALTH ===')
for (const h of creatorHealth(ds, f)) console.log(h.label.padEnd(24), String(Math.round(h.value)).padStart(4), h.status, '|', h.display)

console.log('\n=== CHART ROWS (30d daily) ===', chartRows(ds, f).rows.length, 'rows, gran', chartRows(ds, f).granularity)
console.log('=== 90d gran ===', chartRows(ds, { ...f, period: '90d' }).granularity, chartRows(ds, { ...f, period: '90d' }).rows.length)
console.log('=== YTD gran ===', chartRows(ds, { ...f, period: 'ytd' }).granularity, chartRows(ds, { ...f, period: 'ytd' }).rows.length)
console.log('\n=== FUNNEL ===')
for (const s of funnelStages(ds, f)) console.log(s.label.padEnd(16), fk(s.value).padStart(9), 'share', s.share.toFixed(3) + '%', 'step', s.stepRate.toFixed(1) + '%')

console.log('\n=== REVENUE (last 6 months) ===')
for (const r of revenueTimeline(ds).slice(-6)) console.log(r.label.padEnd(9), 'rev $' + fk(r.total).padStart(7), 'exp $' + fk(r.expenses).padStart(7), 'net $' + fk(r.net))
console.log('deals', JSON.stringify(dealStats(ds), (k, v) => typeof v === 'number' ? Math.round(v) : v))

console.log('\n=== SCOPED (topic filter) ===')
const scoped = { ...f, topicIds: ['t-agents'] }
const content = scopeContent(ds, scoped, p)
console.log('t-agents in scope:', content.length, 'items; published in range:', content.filter(c => c.publishDate && c.publishDate >= p.from && c.publishDate <= p.to).length)
const cr = contentRows(ds, scoped)
console.log('rows', cr.length, 'views', fk(cr.reduce((s, r) => s + r.views, 0)))

console.log('\n=== CONTENT COUNT ===', ds.content.length, '| published', ds.content.filter(c => c.status === 'published').length, '| ideas', ds.ideas.length, '| research', ds.research.length, '| assets', ds.assets.length)
console.log('contentSeries coverage:', Object.keys(ds.contentSeries).length)
const zeroPerf = ds.content.filter(c => c.publishDate && !c.performance)
console.log('published without performance:', zeroPerf.length, zeroPerf.map(c => c.id).join(','))
const orphans = ds.content.filter(c => c.parentId && !ds.content.find(p => p.id === c.parentId))
console.log('orphan derivatives:', orphans.length)
