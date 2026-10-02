import type {
  Asset,
  AudienceSnapshot,
  BrandDeal,
  Campaign,
  Content,
  ContentBrief,
  ContentDayPoint,
  ContentPerformance,
  Dataset,
  Demographics,
  Expense,
  Idea,
  Invoice,
  MetricSample,
  PlatformId,
  ScriptBlock,
  Series,
} from '../types'
import { AUDIENCE_BASELINE, CONTENT_TYPES, PLATFORMS, STATUSES, WORDS_PER_MINUTE, contentTypeById } from '../registry'
import { CAMPAIGNS, CLUSTERS, SERIES, TOPICS } from '../taxonomy'
import { Rng } from '../rng'
import { AUTHORED, type Authored, type Quality } from './content'
import { IDEAS } from './ideas'
import { RESEARCH } from './research'
import { ASSETS } from './assets'
import { BRAND, NOTIFICATIONS } from './brand'
import { DEALS, EXPENSES, INVOICES, REVENUE_SOURCES, SOURCE_BASE, MONTH_WEIGHTS } from './business'

/* ============================================================================
   DATASET BUILDER
   One deterministic pass produces the whole workspace: content, a 700-day
   metric history, and per-content performance derived FROM that history. Charts
   and tables therefore agree by construction — a drill-down always reconciles
   with the aggregate it came from.
   ========================================================================== */

const HISTORY_DAYS = 700
const SEED = 20261002
const LIVE: PlatformId[] = ['youtube', 'instagram', 'linkedin']

/* ============================================================================
   SIMULATION TUNING
   ========================================================================== */
const QUALITY_MULT: Record<Quality, number> = { hit: 3.0, strong: 1.65, solid: 1, average: 0.6, weak: 0.36 }

interface PlatformProfile {
  base: number
  halflife: number
  engRate: number
  watchPerView: number
  followRate: number
  reachRatio: number
  weekly: number[]
  clickRate: number
  churn: number
}

const PLATFORM_PROFILE: Record<string, PlatformProfile> = {
  youtube: {
    base: 22_500,
    halflife: 7.5,
    engRate: 0.062,
    watchPerView: 4.4,
    followRate: 0.0026,
    reachRatio: 0.78,
    weekly: [1.06, 1.08, 1.02, 0.98, 0.96, 0.92, 1.02],
    clickRate: 0.011,
    churn: 0.2,
  },
  instagram: {
    base: 15_200,
    halflife: 3.1,
    engRate: 0.081,
    watchPerView: 0.6,
    followRate: 0.0015,
    reachRatio: 0.88,
    weekly: [0.98, 1.0, 1.02, 1.04, 1.08, 1.06, 1.0],
    clickRate: 0.004,
    churn: 0.26,
  },
  linkedin: {
    base: 12_400,
    halflife: 1.9,
    engRate: 0.049,
    watchPerView: 0.3,
    followRate: 0.0011,
    reachRatio: 0.66,
    weekly: [1.22, 1.18, 1.12, 1.06, 0.94, 0.52, 0.58],
    clickRate: 0.009,
    churn: 0.12,
  },
}

const PEAK_RANGE: Record<string, [number, number]> = {
  'yt-long': [7_000, 58_000],
  'yt-short': [8_000, 112_000],
  'ig-reel': [6_000, 88_000],
  'ig-carousel': [4_000, 34_000],
  'li-post': [5_000, 46_000],
  'li-doc': [6_000, 38_000],
  newsletter: [8_000, 13_500],
  podcast: [3_000, 22_000],
  'case-study': [3_500, 18_000],
}

const FIELD_VALUES: Record<string, () => number | string> = {}

/* ============================================================================
   ENTRY POINT
   ========================================================================== */
export function buildDataset(): Dataset {
  const rng = new Rng(SEED)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dayKeys: string[] = []
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dayKeys.push(isoDay(d))
  }
  const idx = new Map(dayKeys.map((k, i) => [k, i]))
  const todayKey = dayKeys[dayKeys.length - 1]

  /* ---------------------------------------------------------------- content */
  const content: Content[] = AUTHORED.map((a) => expandAuthored(a, dayKeys, idx, todayKey, rng))

  /* ---------------------------------------------------------------- taxonomy links */
  const series: Series[] = SERIES.map((s) => ({
    ...s,
    contentIds: content.filter((c) => c.seriesId === s.id).map((c) => c.id),
  }))

  const campaigns: Campaign[] = CAMPAIGNS.map((c) => {
    const linked = content.filter((x) => x.campaignId === c.id)
    const dates = linked.map((x) => x.publishDate ?? x.deadline).filter(Boolean) as string[]
    dates.sort()
    return {
      ...c,
      contentIds: linked.map((x) => x.id),
      start: dates[0] ?? todayKey,
      end: dates[dates.length - 1] ?? todayKey,
    }
  })

  /* ---------------------------------------------------------------- metrics */
  const { metrics, performance, audience, contentSeries } = simulate(dayKeys, content, rng)
  for (const c of content) {
    const perf = performance.get(c.id)
    if (perf) c.performance = perf
  }

  /* ---------------------------------------------------------------- repurposing graph */
  for (const c of content) {
    c.derivativeIds = content.filter((d) => d.parentId === c.id).map((d) => d.id)
  }

  /* ---------------------------------------------------------------- assets */
  const assets: Asset[] = ASSETS.map((a, i) => ({
    ...a,
    createdAt: dayKeys[Math.max(0, idx.get(todayKey)! - (i * 6 + 3))],
  }))

  /* ---------------------------------------------------------------- business */
  const { entries, expenses }: { entries: Dataset['revenueEntries']; expenses: Expense[] } = buildRevenue(
    dayKeys,
    idx,
    todayKey,
    rng,
  )

  const deals: BrandDeal[] = DEALS.map((d) => ({
    id: d.id,
    brand: d.brand,
    campaign: d.campaign,
    industry: d.industry,
    contact: d.contact,
    deadline: shiftKey(todayKey, d.deadlineOffset),
    fee: d.fee,
    status: d.status,
    paymentStatus: d.paymentStatus,
    color: d.color,
    notes: d.notes,
    deliverables: d.deliverables.map((x, i) => ({
      id: `${d.id}-del-${i}`,
      label: x.label,
      done: x.done,
      due: shiftKey(todayKey, x.dueOffset),
    })),
    performance: d.performance,
  }))

  const invoices: Invoice[] = INVOICES.map((v) => ({
    id: v.id,
    number: v.number,
    dealId: v.dealId,
    brand: v.brand,
    amount: v.amount,
    issued: shiftKey(todayKey, v.issuedOffset),
    due: shiftKey(todayKey, v.dueOffset),
    status: v.status,
  }))

  /* ---------------------------------------------------------------- notifications */
  const notificationHours = [3, 7, 19, 26, 41, 55, 68, 96]
  const notifications = NOTIFICATIONS.map((n, i) => ({
    ...n,
    at: new Date(today.getTime() - notificationHours[i] * 3600_000 - i * 1_800_000).toISOString(),
  }))

  /* ---------------------------------------------------------------- ideas */
  const ideas: Idea[] = IDEAS.map((i) => ({ ...i, scores: { ...i.scores } }))

  return {
    creator: {
      id: 'cr-1',
      name: 'Aarav Menon',
      handle: '@aarav.builds',
      role: 'Solo creator · AI & product engineering',
      avatarSeed: 77,
      timezone: 'Asia/Kolkata · IST',
      mission: 'Ship AI that survives production. Publish the numbers either way.',
      workspace: 'ws-personal',
      workspaces: [
        { id: 'ws-personal', name: 'Aarav Menon', role: 'Owner', color: '#5B9DFF' },
        { id: 'ws-studio', name: 'Northlight Studio', role: 'Owner', color: '#A78BFA' },
        { id: 'ws-client', name: 'Kite Systems (client)', role: 'Contributor', color: '#34D399' },
      ],
    },
    platforms: PLATFORMS,
    statuses: STATUSES,
    contentTypes: CONTENT_TYPES,
    topics: TOPICS,
    series,
    campaigns,
    content,
    ideas,
    clusters: CLUSTERS.map((c) => ({ ...c })),
    research: RESEARCH,
    assets,
    revenueSources: REVENUE_SOURCES,
    revenueEntries: entries,
    expenses,
    deals,
    invoices,
    audience,
    demographics: DEMOGRAPHICS,
    metrics,
    brand: BRAND,
    templates: [
      { id: 'tp-1', name: 'Build-along teardown', typeId: 'yt-long', description: 'Build on camera, break on camera, fix on camera. Proven retention shape.', stages: ['Research', 'Brief', 'Scripting', 'Production', 'Editing', 'Review'], usage: 14 },
      { id: 'tp-2', name: 'Honest numbers report', typeId: 'yt-long', description: 'Revenue and cost transparency with audited figures.', stages: ['Brief', 'Scripting', 'Editing', 'Review'], usage: 6 },
      { id: 'tp-3', name: 'Field documentary', typeId: 'yt-long', description: 'Multi-location reporting with primary interviews.', stages: ['Research', 'Production', 'Editing', 'Review'], usage: 3 },
      { id: 'tp-4', name: 'Save-bait carousel', typeId: 'ig-carousel', description: 'Nine slides, one concept, one diagram per slide.', stages: ['Brief', 'Production', 'Review'], usage: 21 },
      { id: 'tp-5', name: 'Hook-first Reel', typeId: 'ig-reel', description: 'The first 1.5 seconds carry the whole asset.', stages: ['Scripting', 'Editing', 'Review'], usage: 33 },
      { id: 'tp-6', name: 'LinkedIn teardown post', typeId: 'li-post', description: 'One insight, five numbered lines, question close.', stages: ['Brief', 'Scripting', 'Review'], usage: 48 },
    ],
    notifications,
    dayKeys,
    todayKey,
    contentSeries,
    generatedAt: new Date().toISOString(),
  }
}

/* ============================================================================
   CONTENT EXPANSION
   ========================================================================== */
const CHECKLIST_TEMPLATE: { label: string; group: 'pre' | 'shoot' | 'post' | 'publish' }[] = [
  { label: 'Research', group: 'pre' },
  { label: 'Script', group: 'pre' },
  { label: 'Recording', group: 'shoot' },
  { label: 'A-roll', group: 'shoot' },
  { label: 'B-roll', group: 'shoot' },
  { label: 'Voiceover', group: 'shoot' },
  { label: 'Edit', group: 'post' },
  { label: 'Thumbnail', group: 'post' },
  { label: 'Caption', group: 'post' },
  { label: 'SEO', group: 'post' },
  { label: 'Review', group: 'publish' },
  { label: 'Publish', group: 'publish' },
]

function expandAuthored(a: Authored, dayKeys: string[], idx: Map<string, number>, todayKey: string, rng: Rng): Content {
  const type = contentTypeById(a.typeId)
  const published = a.daysAgo !== undefined
  const publishDate = published ? dayKeys[Math.max(0, idx.get(todayKey)! - a.daysAgo!)] : undefined
  const deadline = a.dueInDays !== undefined ? shiftKey(todayKey, a.dueInDays) : undefined

  const createdDaysAgo = published ? a.daysAgo! + rng.int(18, 46) : rng.int(2, 55)
  const createdAt = dayKeys[Math.max(0, idx.get(todayKey)! - createdDaysAgo)]
  const updatedAt = dayKeys[Math.max(0, idx.get(todayKey)! - (published ? rng.int(0, 12) : rng.int(0, 4)))]

  const script = scriptFor(a)
  const words = script.reduce((s, b) => s + countWords(b.body), 0)
  const stageOrder = STATUSES.find((s) => s.id === a.status)?.order ?? 0
  const doneCount = a.doneChecks ?? Math.min(11, Math.round(stageOrder * 1.05))

  const checklist = CHECKLIST_TEMPLATE.map((t, i) => ({
    id: `${a.id}-ck-${i}`,
    label: t.label,
    group: t.group,
    done: i < doneCount,
  }))

  const versions =
    a.status === 'idea' || a.status === 'research'
      ? []
      : [
          {
            id: `${a.id}-v3`,
            label: `v${published ? 4 : 3}.0`,
            author: 'Aarav Menon',
            at: updatedAt,
            words,
            summary: published ? 'Locked for publish.' : 'Structure locked. Tightening the middle third.',
            current: true,
          },
          {
            id: `${a.id}-v2`,
            label: `v${published ? 3 : 2}.0`,
            author: 'Aarav Menon',
            at: dayKeys[Math.max(0, idx.get(updatedAt)! - 4)],
            words: Math.round(words * 1.24),
            summary: 'Restructured after the research pass. Cut two sections.',
          },
          {
            id: `${a.id}-v1`,
            label: 'v1.0',
            author: 'Aarav Menon',
            at: createdAt,
            words: Math.round(words * 1.9),
            summary: 'First full pass from the brief. Too long, too general.',
          },
        ]

  const brief: ContentBrief = {
    objective: a.brief?.objective ?? defaultObjective(a),
    audience: a.brief?.audience ?? defaultAudience(a),
    coreMessage: a.brief?.coreMessage ?? `${a.title} is a decision, not a tool choice.`,
    hook: a.brief?.hook ?? 'Open on the sharpest number in the piece, then state the promise.',
    cta: a.brief?.cta ?? 'Newsletter link in the description — the full breakdown ships Thursday.',
    keywords: a.brief?.keywords ?? a.tags,
    keyPoints: a.brief?.keyPoints ?? ['Framing', 'Evidence', 'The decision', 'What it costs'],
  }

  return {
    id: a.id,
    code: `CN-${a.id.replace('ct-', '').toUpperCase().padEnd(6, '0').slice(0, 6)}`,
    title: a.title,
    typeId: a.typeId,
    format: type.format,
    platforms: a.platforms,
    status: a.status,
    priority: a.priority,
    tags: a.tags,
    topicId: a.topicId,
    seriesId: a.seriesId,
    campaignId: a.campaignId,
    publishDate,
    deadline,
    createdAt,
    updatedAt,
    brief,
    script,
    versions,
    checklist,
    researchIds: RESEARCH_LINKS[a.topicId] ?? [],
    assetIds: ASSET_LINKS[a.id] ?? [],
    notes: a.notes ?? '',
    derivativeIds: [],
    parentId: a.parentId,
    sourceId: a.sourceId,
    effortHours: a.effortHours,
    thumbnailSeed: a.thumb ?? rng.int(1, 40),
    pinned: a.pinned,
    customFields: type.fields.length
      ? Object.fromEntries(
          type.fields.map((f) => [f.id, f.type === 'number' ? rng.int(35, 55) : (f.options?.[0] ?? '—')]),
        )
      : undefined,
  }
}

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length

function scriptFor(a: Authored): ScriptBlock[] {
  if (a.script) return a.script
  const brief = a.brief ?? {}
  const points = brief.keyPoints ?? ['Framing', 'Evidence', 'The decision', 'What it costs']
  const blocks: ScriptBlock[] = [
    {
      id: 'sb1',
      kind: 'hook',
      title: 'Hook',
      body: brief.hook ?? 'Open on the hardest number in this piece. State the promise in one sentence, then earn it.',
      note: 'Under 15 seconds. Cut anything that delays the promise.',
    },
    {
      id: 'sb2',
      kind: 'intro',
      title: 'Intro — the promise',
      body: `Set up what changes by the end: ${brief.coreMessage ?? 'the viewer leaves with one decision they can make today.'}`,
    },
  ]
  points.forEach((p, i) => {
    blocks.push({
      id: `sb-sec-${i}`,
      kind: 'section',
      title: `Part ${i + 1} — ${p}`,
      body: `Develop this with one concrete number and one specific story. Write the transition to the next beat before moving on.`,
      note: i === 1 ? 'B-roll: screen capture, 8–12 seconds.' : undefined,
    })
  })
  if (brief.cta) {
    blocks.push({ id: 'sb-cta', kind: 'cta', title: 'CTA', body: brief.cta, note: 'Verbal only. Keep it under 12 seconds.' })
  }
  blocks.push({ id: 'sb-outro', kind: 'outro', title: 'Outro', body: 'Preview the next piece and name the throughline of the series.' })
  return blocks
}

function defaultObjective(a: Authored) {
  const byFormat: Record<string, string> = {
    'long-form': 'Deliver the definitive treatment on this topic with reproducible evidence.',
    short: 'Land one idea in under 60 seconds and drive discovery to the long form.',
    reel: 'Earn the scroll-stop and the save in the first 1.5 seconds.',
    carousel: 'Give the audience something worth saving and returning to.',
    text: 'Convert a professional insight into credibility with the hiring and client audience.',
    story: 'Keep the audience warm between flagship pieces.',
    newsletter: 'Deepen the subscriber relationship and convert reach into owned audience.',
    podcast: 'Build authority through a guest’s first-person account.',
  }
  return byFormat[contentTypeById(a.typeId).format] ?? 'Produce the strongest possible piece on this topic.'
}

function defaultAudience(a: Authored) {
  const byTopic: Record<string, string> = {
    't-agents': 'Developers who have shipped a demo but not a production agent.',
    't-market': 'Indian tech professionals plus a global audience watching adoption outside the US.',
    't-craft': 'Creators between 10k and 200k followers stuck at flat growth.',
    't-monetise': 'Creators and consultants pricing their first serious offer.',
    't-ops': 'Solo operators past $5k/month who are the bottleneck in their own business.',
    't-shipping': 'Working developers who tried AI coding tools and quietly stopped.',
    't-aistack': 'Small teams budgeting for AI toolinoling without a finance function.',
    't-datastack': 'Backend engineers moving into AI workloads.',
  }
  return byTopic[a.topicId] ?? 'Working developers and technical creators who value specifics over hype.'
}

/** Content ↔ research links, authored rather than random. */
const RESEARCH_LINKS: Record<string, string[]> = {
  't-agents': ['rs-02', 'rs-11', 'rs-21'],
  't-market': ['rs-04', 'rs-05', 'rs-09'],
  't-craft': ['rs-08', 'rs-25'],
  't-monetise': ['rs-03', 'rs-20', 'rs-22'],
  't-ops': ['rs-06', 'rs-14', 'rs-19'],
  't-shipping': ['rs-08'],
  't-aistack': ['rs-01', 'rs-07'],
  't-datastack': ['rs-10'],
  't-rag': ['rs-16', 'rs-23'],
  't-models': ['rs-16'],
  't-arch': ['rs-02', 'rs-24'],
  't-product': ['rs-12'],
  't-aiwork': ['rs-14', 'rs-19'],
  't-growth': ['rs-13', 'rs-17', 'rs-18'],
  't-aiframework': ['rs-11'],
  't-ai': ['rs-15'],
  't-startups': ['rs-12'],
  't-focus': ['rs-06'],
}

const ASSET_LINKS: Record<string, string[]> = {
  'ct-agent': ['as-v01', 'as-t01', 'as-a01', 'as-a04', 'as-d01', 'as-i04', 'as-v09', 'as-v12'],
  'ct-india': ['as-v02', 'as-t04', 'as-a02', 'as-a05', 'as-v06', 'as-v07', 'as-i02', 'as-i03', 'as-d06'],
  'ct-codefaster': ['as-v03', 'as-t05', 'as-a06', 'as-i01'],
  'ct-saas30': ['as-v04', 'as-t03', 'as-s02'],
  'ct-pipeline': ['as-v05', 'as-t07', 'as-d02', 'as-t10'],
  'ct-vs': ['as-v10', 'as-t08', 'as-d01'],
  'ct-patterns': ['as-t09', 'as-i04'],
  'ct-postgres': ['as-v08', 'as-a06'],
  'ct-demo-fails': ['as-i06', 'as-s01'],
  'ct-delete40': ['as-s03', 'as-i05', 'as-d07'],
  'ct-ai-stack': ['as-s04'],
  'ct-podcast-1': ['as-v11', 'as-a03', 'as-a08', 'as-i09'],
  'ct-li-automations': ['as-i07'],
  'ct-agent-carousel': ['as-i08'],
  'ct-timeline': ['as-s06'],
  'ct-li-retainer': ['as-d03'],
  'ct-agent-short': ['as-v09'],
  'ct-india-short': ['as-v06'],
  'ct-india-reel': ['as-i03'],
  'ct-automation': ['as-t02'],
  'ct-mistake': ['as-t06'],
}

/* ============================================================================
   METRIC + PERFORMANCE SIMULATION
   Baselines are computed per day into flat arrays first, then per-content
   spikes are layered on. Materialising afterwards keeps everything additive.
   ========================================================================== */
function simulate(dayKeys: string[], content: Content[], rng: Rng) {
  const N = dayKeys.length
  const idx = new Map(dayKeys.map((k, i) => [k, i]))

  type Acc = Record<string, number>
  const blank = (): Acc => ({
    views: 0,
    reach: 0,
    impressions: 0,
    engagements: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    watchMinutes: 0,
    followersGained: 0,
    clicks: 0,
    revenue: 0,
  })

  /* One accumulator array per platform, indexed by day. */
  const daily: Record<string, Acc[]> = {}
  for (const p of LIVE) {
    daily[p] = Array.from({ length: N }, blank)
  }

  /* ---- baseline ---- */
  for (const p of LIVE) {
    const prof = PLATFORM_PROFILE[p]
    for (let i = 0; i < N; i++) {
      const growth = 1 + (i / N) * 0.62
      const dow = new Date(dayKeys[i] + 'T00:00:00').getDay()
      const weekly = prof.weekly[dow]
      const noise = 0.93 + rng.next() * 0.14
      const seasonal = 1 + Math.sin((i / 91) * Math.PI * 2) * 0.045
      const views = prof.base * growth * weekly * noise * seasonal
      const a = daily[p][i]
      a.views += views
      a.reach += views * prof.reachRatio
      a.impressions += views * 1.14
      a.engagements += views * prof.engRate * (0.9 + rng.next() * 0.2)
      a.watchMinutes += views * prof.watchPerView
      a.followersGained += views * prof.followRate * (0.85 + rng.next() * 0.3)
      a.clicks += views * prof.clickRate
      a.likes += views * prof.engRate * 0.68
      a.comments += views * prof.engRate * 0.055
      a.shares += views * prof.engRate * 0.09
      a.saves += views * prof.engRate * 0.13
      a.revenue += views * (p === 'youtube' ? 0.0041 : 0.0006)
    }
  }

  /* ---- content spikes ---- */
  const performance = new Map<string, ContentPerformance>()
  const contentSeries: Record<string, ContentDayPoint[]> = {}
  for (const c of content) {
    if (!c.publishDate) continue
    const start = idx.get(c.publishDate)
    if (start === undefined) continue
    const primary = c.platforms[0]
    const prof = PLATFORM_PROFILE[primary] ?? PLATFORM_PROFILE.youtube
    const type = contentTypeById(c.typeId)
    const range = PEAK_RANGE[type.id] ?? [8_000, 60_000]
    const q: Quality = qualityFor(c)
    const platformScale = primary === 'youtube' ? 1 : primary === 'instagram' ? 0.86 : 0.7
    const peak = (range[0] + (range[1] - range[0]) * rng.next()) * QUALITY_MULT[q] * 0.5 * platformScale

    const lifetime = 60
    let totalViews = 0
    const points = new Map<string, ContentDayPoint>()
    const touch = (date: string): ContentDayPoint => {
      let p = points.get(date)
      if (!p) {
        p = { date, views: 0, reach: 0, engagements: 0, watchMinutes: 0, followersGained: 0, revenue: 0 }
        points.set(date, p)
      }
      return p
    }

    for (let t = 0; t < lifetime; t++) {
      const i = start + t
      if (i >= N) break
      const decay = Math.exp(-t / prof.halflife)
      const tail = t > 21 ? 0.012 : 0
      const views = peak * (decay + tail) * (t === 0 ? 1.34 : 1) * (0.94 + rng.next() * 0.12)
      totalViews += views
      const a = daily[primary][i]
      a.views += views
      a.reach += views * prof.reachRatio
      a.impressions += views * 1.14
      a.engagements += views * prof.engRate * (q === 'hit' ? 1.24 : 1)
      a.watchMinutes += views * prof.watchPerView * (q === 'hit' ? 1.18 : q === 'average' ? 0.86 : 1)
      a.followersGained += views * prof.followRate * (q === 'hit' ? 1.9 : q === 'strong' ? 1.35 : 1)
      a.clicks += views * prof.clickRate * (q === 'hit' ? 1.5 : 1)
      a.likes += views * prof.engRate * 0.68
      a.comments += views * prof.engRate * 0.055
      a.shares += views * prof.engRate * 0.09
      a.saves += views * prof.engRate * 0.13
      a.revenue += views * (primary === 'youtube' ? 0.0041 : 0.0006)

      const p = touch(dayKeys[i])
      p.views += views
      p.reach += views * prof.reachRatio
      p.engagements += views * prof.engRate * (q === 'hit' ? 1.24 : 1)
      p.watchMinutes += views * prof.watchPerView * (q === 'hit' ? 1.18 : 1)
      p.followersGained += views * prof.followRate * (q === 'hit' ? 1.9 : 1.35)
      p.revenue += views * (primary === 'youtube' ? 0.0041 : 0.0006)
    }

    /* A piece published to more than one platform lifts the siblings. */
    for (const sp of c.platforms.slice(1)) {
      const sprof = PLATFORM_PROFILE[sp]
      if (!sprof) continue
      for (let t = 0; t < 21; t++) {
        const i = start + t
        if (i >= N) break
        const views = peak * 0.22 * sprof.reachRatio * Math.exp(-t / sprof.halflife)
        const a = daily[sp][i]
        a.views += views
        a.reach += views * sprof.reachRatio
        a.impressions += views * 1.14
        a.engagements += views * sprof.engRate
        a.watchMinutes += views * sprof.watchPerView
        a.followersGained += views * sprof.followRate
        const p = touch(dayKeys[i])
        p.views += views
        p.reach += views * sprof.reachRatio
        p.engagements += views * sprof.engRate
        p.watchMinutes += views * sprof.watchPerView
        p.followersGained += views * sprof.followRate
      }
    }

    contentSeries[c.id] = [...points.values()]
      .sort((x, y) => x.date.localeCompare(y.date))
      .map((p) => ({
        date: p.date,
        views: Math.round(p.views),
        reach: Math.round(p.reach),
        engagements: Math.round(p.engagements),
        watchMinutes: Math.round(p.watchMinutes),
        followersGained: Math.round(p.followersGained),
        revenue: Math.round(p.revenue * 100) / 100,
      }))

    const views = Math.round(totalViews)
    const reach = Math.round(views * prof.reachRatio)
    const engagements = Math.round(views * prof.engRate * (q === 'hit' ? 1.28 : q === 'strong' ? 1.1 : 1))
    const curve = retentionShape(rng, q)
    performance.set(c.id, {
      views,
      reach,
      impressions: Math.round(views * 1.14),
      engagements,
      likes: Math.round(engagements * 0.66),
      comments: Math.round(engagements * 0.052),
      shares: Math.round(engagements * 0.088),
      saves: Math.round(engagements * 0.128),
      watchMinutes: Math.round(views * prof.watchPerView * (q === 'hit' ? 1.18 : 1)),
      retention: curve[curve.length - 1] + rng.int(6, 26),
      followersGained: Math.round(views * prof.followRate * (q === 'hit' ? 1.9 : 1.25)),
      clicks: Math.round(views * prof.clickRate),
      revenue: Math.round(views * (primary === 'youtube' ? 0.0041 : 0.0006) * 100) / 100,
      retentionCurve: curve,
    })
  }

  /* ---- materialise daily samples ---- */
  const metrics: MetricSample[] = []
  const audience: AudienceSnapshot[] = []
  const running: Record<string, number> = { ...AUDIENCE_BASELINE }

  for (let i = 0; i < N; i++) {
    for (const p of LIVE) {
      const a = daily[p][i]
      const prof = PLATFORM_PROFILE[p]
      const reach = Math.round(a.reach)
      const engagements = Math.round(a.engagements)
      const gained = Math.round(a.followersGained)
      metrics.push({
        date: dayKeys[i],
        platform: p,
        views: Math.round(a.views),
        reach,
        impressions: Math.round(a.impressions),
        engagements,
        likes: Math.round(a.likes),
        comments: Math.round(a.comments),
        shares: Math.round(a.shares),
        saves: Math.round(a.saves),
        watchMinutes: Math.round(a.watchMinutes),
        followersGained: gained,
        clicks: Math.round(a.clicks),
        revenue: Math.round(a.revenue * 100) / 100,
        engagementRate: reach > 0 ? Math.round((engagements / reach) * 10000) / 100 : 0,
        audience: Math.round(running[p]),
      })
      const lost = Math.round(gained * prof.churn)
      running[p] += gained - lost
      audience.push({
        date: dayKeys[i],
        platform: p,
        followers: Math.round(running[p]),
        gained,
        lost,
        returningShare: Math.round((0.42 + Math.sin(i / 60) * 0.05) * 1000) / 1000,
      })
    }
  }

  return { metrics, performance, audience, contentSeries }
}

function qualityFor(c: Content): Quality {
  return AUTHORED.find((a) => a.id === c.id)?.quality ?? 'solid'
}

function retentionShape(rng: Rng, quality: Quality): number[] {
  const shapes: Record<Quality, number[][]> = {
    hit: [
      [100, 96, 94, 92, 90, 89, 88, 86, 84, 82, 80, 78, 76, 74, 72, 70, 68, 66, 62, 58],
      [100, 88, 84, 82, 83, 84, 85, 84, 83, 82, 80, 79, 78, 77, 75, 73, 71, 68, 64, 60],
    ],
    strong: [
      [100, 84, 79, 76, 74, 73, 72, 70, 68, 66, 63, 61, 59, 57, 55, 53, 51, 48, 44, 40],
      [100, 90, 82, 78, 74, 71, 69, 68, 67, 65, 62, 60, 57, 55, 52, 50, 47, 44, 40, 36],
    ],
    solid: [
      [100, 78, 70, 64, 60, 57, 55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 32, 29, 25],
      [100, 82, 72, 66, 61, 58, 56, 55, 54, 52, 49, 46, 43, 40, 37, 34, 31, 28, 24, 20],
    ],
    average: [
      [100, 68, 56, 49, 44, 41, 38, 35, 33, 31, 29, 27, 25, 23, 22, 20, 18, 16, 14, 12],
      [100, 74, 60, 50, 43, 38, 34, 31, 29, 27, 25, 24, 22, 20, 18, 16, 14, 12, 10, 8],
    ],
    weak: [[100, 58, 45, 38, 33, 29, 26, 23, 21, 19, 17, 15, 14, 12, 11, 10, 9, 8, 7, 6]],
  }
  const set = shapes[quality]
  const base = set[rng.int(0, set.length - 1)]
  return base.map((v) => Math.max(3, Math.round(v + rng.float(-1.6, 1.6))))
}

/* ============================================================================
   REVENUE
   ========================================================================== */
function buildRevenue(dayKeys: string[], idx: Map<string, number>, todayKey: string, rng: Rng) {
  const N = dayKeys.length
  const entries: Dataset['revenueEntries'] = []
  const MONTHS = 14

  const descriptors: Record<string, string[]> = {
    'r-yt': ['AdSense payout', 'AdSense payout — strong month'],
    'r-yt-member': ['Channel memberships', 'Memberships + Super Thanks'],
    'r-brand': ['Brand deal — integration', 'Brand deal — dedicated video', 'Brand deal — usage rights'],
    'r-aff': ['Affiliate — tool referrals', 'Affiliate — course referrals'],
    'r-prod': ['Digital product sales', 'Notion template pack', 'Prompt library sales'],
    'r-consult': ['Consulting retainer', 'Advisory — architecture review', 'Workshop delivery'],
    'r-course': ['AgentKit course sales', 'AgentKit — cohort intake'],
    'r-speak': ['Conference keynote', 'Podcast sponsorship'],
    'r-licence': ['Footage licensing', 'Article syndication'],
  }

  for (let m = MONTHS - 1; m >= 0; m--) {
    const d = new Date(todayKey + 'T00:00:00')
    d.setMonth(d.getMonth() - m, 1)
    const key = isoDay(d)
    const i = idx.get(key) ?? Math.max(0, N - 1 - m * 30)
    const weight = MONTH_WEIGHTS[d.getMonth() % 12]
    const trend = 1 + ((MONTHS - m) / MONTHS) * 0.78
    for (const src of REVENUE_SOURCES) {
      const base = SOURCE_BASE[src.id] ?? 200
      const lumpy = src.category === 'direct' || src.category === 'other'
      if (lumpy && rng.next() < 0.34) continue
      const amount = Math.round(base * weight * trend * rng.float(0.82, 1.22))
      if (amount <= 0) continue
      entries.push({
        id: `rv-${src.id}-${m}`,
        sourceId: src.id,
        date: dayKeys[Math.min(N - 1, i)],
        amount,
        description: rng.pick(descriptors[src.id] ?? [src.name]),
        recurring: src.category === 'platform',
      })
    }
  }

  const expenses: Expense[] = []
  for (let m = 13; m >= 0; m--) {
    const d = new Date(todayKey + 'T00:00:00')
    d.setMonth(d.getMonth() - m, 1)
    const key = isoDay(d)
    const i = idx.get(key) ?? Math.max(0, N - 1 - m * 30)
    for (const e of EXPENSES) {
      const oneOff = (e as { oneOff?: number }).oneOff ?? 0
      const amount = e.monthly + (oneOff && m === 4 ? oneOff : 0)
      if (amount <= 0) continue
      expenses.push({
        id: `ex-${e.id}-${m}`,
        date: dayKeys[Math.min(N - 1, i)],
        amount: Math.round(amount * (1 + (13 - m) * 0.012)),
        category: e.category,
        description: e.description,
      })
    }
  }

  return { entries, expenses }
}

/* ============================================================================
   DEMOGRAPHICS
   ========================================================================== */
const DEMOGRAPHICS: Demographics = {
  ages: [
    { bucket: '18–24', share: 18.4 },
    { bucket: '25–34', share: 42.1 },
    { bucket: '35–44', share: 24.7 },
    { bucket: '45–54', share: 9.8 },
    { bucket: '55+', share: 5.0 },
  ],
  gender: [
    { label: 'Men', share: 71.2 },
    { label: 'Women', share: 26.4 },
    { label: 'Other / undisclosed', share: 2.4 },
  ],
  geo: [
    { country: 'India', code: 'IN', share: 46.2, followers: 168_400 },
    { country: 'United States', code: 'US', share: 16.8, followers: 61_200 },
    { country: 'United Kingdom', code: 'GB', share: 6.4, followers: 23_300 },
    { country: 'Germany', code: 'DE', share: 4.9, followers: 17_900 },
    { country: 'Canada', code: 'CA', share: 3.8, followers: 13_800 },
    { country: 'Singapore', code: 'SG', share: 3.1, followers: 11_300 },
    { country: 'United Arab Emirates', code: 'AE', share: 2.7, followers: 9_800 },
    { country: 'Australia', code: 'AU', share: 2.4, followers: 8_700 },
    { country: 'Netherlands', code: 'NL', share: 1.9, followers: 6_900 },
    { country: 'Other', code: '—', share: 11.8, followers: 43_000 },
  ],
  device: [
    { label: 'Mobile', share: 68.4 },
    { label: 'Desktop', share: 24.1 },
    { label: 'Tablet', share: 5.3 },
    { label: 'TV', share: 2.2 },
  ],
}

/* ============================================================================
   UTILITIES
   ========================================================================== */
function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftKey(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return isoDay(d)
}

export const WORDS_PER_MIN = WORDS_PER_MINUTE
export const scriptStats = (blocks: ScriptBlock[]) => {
  const words = blocks.reduce((s, b) => s + countWords(b.body), 0)
  const minutes = words / WORDS_PER_MINUTE
  return {
    words,
    minutes,
    readingTime: Math.max(1, Math.round(words / 220)),
    blocks: blocks.length,
  }
}

/* Kept for future custom-field defaults. */
export const _fieldValues = FIELD_VALUES
export const CONTENT_TYPES_LIST = CONTENT_TYPES
