/* ============================================================================
   CREATOR OS — DOMAIN MODEL
   Every screen in the product is a projection of these entities.
   The shape is deliberately API-ready: a REST/GraphQL layer can replace the
   seed generators without any component changes.
   ========================================================================== */

/* --- Platforms ------------------------------------------------------------
   `status: 'live' | 'planned'` drives the whole product. Planned platforms are
   fully modelled (metrics, colours, formats) but are never surfaced in the UI,
   so adding X / Threads / TikTok later is a registry flip, not a refactor.   */
export type PlatformId =
  | 'youtube'
  | 'instagram'
  | 'linkedin'
  | 'x'
  | 'threads'
  | 'tiktok'
  | 'newsletter'
  | 'podcast'
  | 'blog'

export interface Platform {
  id: PlatformId
  name: string
  short: string
  status: 'live' | 'planned'
  color: string
  /** Tailwind-safe hex used for chart fills and glows. */
  glow: string
  metricLabel: string
  audienceLabel: string
  connected: boolean
  handle: string
}

/* --- Content taxonomy ----------------------------------------------------- */
export type ContentStatusId =
  | 'idea'
  | 'research'
  | 'brief'
  | 'scripting'
  | 'production'
  | 'editing'
  | 'review'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'archived'

export interface StatusDef {
  id: ContentStatusId | string
  name: string
  /** Position in the canonical workflow. */
  order: number
  accent: string
  /** WIP limits / terminal states for pipeline maths. */
  terminal?: boolean
  custom?: boolean
}

export type ContentFormatId =
  | 'long-form'
  | 'short'
  | 'reel'
  | 'carousel'
  | 'text'
  | 'story'
  | 'thread'
  | 'podcast'
  | 'newsletter'

export interface CustomField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'url' | 'longtext'
  options?: string[]
  placeholder?: string
}

export interface ContentTypeDef {
  id: string
  name: string
  icon: string
  format: ContentFormatId
  platforms: PlatformId[]
  /** Workflow stages this type moves through. */
  workflow: string[]
  fields: CustomField[]
  template?: string
  color: string
  custom?: boolean
  description: string
}

export interface Topic {
  id: string
  name: string
  /** Tree structure powers the Research Map. */
  parentId: string | null
  color: string
  pillar: string
  description?: string
}

export interface Series {
  id: string
  name: string
  color: string
  cadence: string
  contentIds: string[]
}

export interface Campaign {
  id: string
  name: string
  objective: string
  brandId?: string
  start: string
  end: string
  budget: number
  spend: number
  status: 'planning' | 'active' | 'wrapped'
  color: string
  contentIds: string[]
  kpiLabel: string
  kpiTarget: number
  kpiActual: number
}

/* --- Content -------------------------------------------------------------- */
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface ContentPerformance {
  views: number
  reach: number
  impressions: number
  engagements: number
  likes: number
  comments: number
  shares: number
  saves: number
  watchMinutes: number
  retention: number
  followersGained: number
  clicks: number
  revenue: number
  /** Simulated retention curve, sampled at 0..100% of the asset. */
  retentionCurve: number[]
}

export interface ScriptBlock {
  id: string
  kind: 'hook' | 'intro' | 'section' | 'example' | 'broll' | 'visual' | 'cta' | 'outro'
  title: string
  body: string
  /** Production note attached to a section. */
  note?: string
}

export interface ContentVersion {
  id: string
  label: string
  author: string
  at: string
  words: number
  summary: string
  current?: boolean
}

export interface ChecklistItem {
  id: string
  label: string
  group: 'pre' | 'shoot' | 'post' | 'publish'
  done: boolean
  assignee?: string
  due?: string
}

export interface ContentBrief {
  objective: string
  audience: string
  coreMessage: string
  hook: string
  cta: string
  keywords: string[]
  keyPoints: string[]
}

export interface Content {
  id: string
  code: string
  title: string
  typeId: string
  format: ContentFormatId
  platforms: PlatformId[]
  status: ContentStatusId | string
  priority: Priority
  tags: string[]
  topicId: string
  seriesId?: string
  campaignId?: string
  /** ISO date (yyyy-MM-dd). */
  publishDate?: string
  deadline?: string
  createdAt: string
  updatedAt: string
  brief: ContentBrief
  script: ScriptBlock[]
  versions: ContentVersion[]
  checklist: ChecklistItem[]
  researchIds: string[]
  assetIds: string[]
  notes: string
  /** Derivatives are first-class content objects referenced by id. */
  derivativeIds: string[]
  parentId?: string
  /** Root content this derivative came from. */
  sourceId?: string
  effortHours: number
  performance?: ContentPerformance
  customFields?: Record<string, string | number | boolean>
  thumbnailSeed: number
  pinned?: boolean
}

/* --- Ideas ---------------------------------------------------------------- */
export interface IdeaScores {
  audienceRelevance: number
  originality: number
  /** Inverted when computing the total — higher effort is a penalty. */
  effort: number
  potentialReach: number
  strategicRelevance: number
}

export interface Idea {
  id: string
  code: string
  title: string
  hook: string
  problem: string
  audience: string
  platforms: PlatformId[]
  format: ContentFormatId
  potential: 1 | 2 | 3 | 4 | 5
  status: 'raw' | 'exploring' | 'validated' | 'promoted' | 'parked'
  scores: IdeaScores
  notes: string
  references: string[]
  topicId: string
  clusterId: string
  createdAt: string
  promotedContentId?: string
}

export interface IdeaCluster {
  id: string
  name: string
  description: string
  color: string
  topicId: string
}

/* --- Research ------------------------------------------------------------- */
export type ResearchKind =
  | 'source'
  | 'note'
  | 'quote'
  | 'stat'
  | 'competitor'
  | 'trend'
  | 'reference'
  | 'example'
  | 'screenshot'

export interface ResearchItem {
  id: string
  code: string
  kind: ResearchKind
  title: string
  /** Optional: quotes and references may carry only a title + body. */
  summary?: string
  url?: string
  source?: string
  /** 1–5 confidence in the source. */
  credibility: number
  topicId: string
  tags: string[]
  linkedContentIds: string[]
  createdAt: string
  /** Numeric payload for stats / trends so they can be charted. */
  dataPoints?: { label: string; value: number }[]
  quote?: string
  author?: string
}

/* --- Assets --------------------------------------------------------------- */
export type AssetKind =
  | 'video'
  | 'image'
  | 'thumbnail'
  | 'logo'
  | 'audio'
  | 'music'
  | 'document'
  | 'screenshot'

export interface Asset {
  id: string
  name: string
  kind: AssetKind
  mime: string
  /** bytes */
  size: number
  dims?: string
  duration?: string
  createdAt: string
  usedIn: string[]
  tags: string[]
  folder: string
  seed: number
  starred?: boolean
}

/* --- Revenue -------------------------------------------------------------- */
export interface RevenueSource {
  id: string
  name: string
  color: string
  category: 'platform' | 'direct' | 'product' | 'other'
  enabled: boolean
  custom?: boolean
}

export interface RevenueEntry {
  id: string
  sourceId: string
  date: string
  amount: number
  description: string
  contentId?: string
  recurring?: boolean
}

export interface Expense {
  id: string
  date: string
  amount: number
  category: string
  description: string
}

export interface BrandDeal {
  id: string
  brand: string
  campaign: string
  deliverables: { id: string; label: string; done: boolean; due: string }[]
  deadline: string
  fee: number
  status: 'prospect' | 'negotiating' | 'signed' | 'in-production' | 'delivered' | 'paid' | 'lost'
  paymentStatus: 'unpaid' | 'deposit' | 'invoiced' | 'paid' | 'overdue'
  contact: string
  industry: string
  performance?: { reach: number; engagements: number; cpm: number; contentIds: string[] }
  notes: string
  color: string
}

export interface Invoice {
  id: string
  number: string
  dealId: string
  brand: string
  amount: number
  issued: string
  due: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
}

/* --- Audience ------------------------------------------------------------- */
export interface AudienceSnapshot {
  date: string
  platform: PlatformId
  followers: number
  gained: number
  lost: number
  returningShare: number
}

export interface Demographics {
  ages: { bucket: string; share: number }[]
  gender: { label: string; share: number }[]
  geo: { country: string; code: string; share: number; followers: number }[]
  device: { label: string; share: number }[]
}

/* --- Analytics ------------------------------------------------------------ */
export interface MetricSample {
  date: string
  platform: PlatformId
  views: number
  reach: number
  impressions: number
  engagements: number
  likes: number
  comments: number
  shares: number
  saves: number
  watchMinutes: number
  followersGained: number
  clicks: number
  revenue: number
  /** 0–100. */
  engagementRate: number
  /** Denominator for rate calculations. */
  audience: number
}

export interface MetricDef {
  id: MetricId
  label: string
  short: string
  unit: 'count' | 'minutes' | 'currency' | 'percent' | 'hours'
  color: string
  group: 'reach' | 'engagement' | 'growth' | 'business'
  description: string
  /** How this metric aggregates over a period. */
  agg: 'sum' | 'avg' | 'last'
}

export type MetricId =
  | 'views'
  | 'reach'
  | 'impressions'
  | 'engagements'
  | 'followersGained'
  | 'watchMinutes'
  | 'revenue'
  | 'engagementRate'
  | 'followers'
  | 'clicks'

/* --- Brand ---------------------------------------------------------------- */
export interface BrandAsset {
  id: string
  kind: 'color' | 'font' | 'logo' | 'image'
  name: string
  value: string
  role: string
}

export interface BrandSystem {
  name: string
  tagline: string
  mission: string
  voice: { trait: string; do: string; dont: string }[]
  pillars: { id: string; name: string; weight: number; color: string; description: string }[]
  ctas: { id: string; label: string; text: string; use: string; performance: number }[]
  thumbnailStyle: { rule: string; detail: string }[]
  captionStyle: { rule: string; detail: string }[]
  assets: BrandAsset[]
  palette: { name: string; hex: string; role: string }[]
  type: { name: string; usage: string; weight: string; sample: string }[]
  references: { id: string; label: string; note: string; seed: number }[]
}

/* --- Workflow / templates ------------------------------------------------- */
export interface Template {
  id: string
  name: string
  typeId: string
  description: string
  stages: string[]
  usage: number
}

export interface Notification {
  id: string
  kind: 'deadline' | 'deal' | 'trend' | 'system' | 'comment' | 'milestone'
  title: string
  body: string
  at: string
  read: boolean
  href?: string
  severity: 'info' | 'warn' | 'positive' | 'critical'
}

/* --- Creator -------------------------------------------------------------- */
export interface Creator {
  id: string
  name: string
  handle: string
  role: string
  avatarSeed: number
  timezone: string
  mission: string
  workspace: string
  workspaces: { id: string; name: string; role: string; color: string }[]
}

/* --- Root dataset --------------------------------------------------------- */
export interface Dataset {
  creator: Creator
  platforms: Platform[]
  statuses: StatusDef[]
  contentTypes: ContentTypeDef[]
  topics: Topic[]
  series: Series[]
  campaigns: Campaign[]
  content: Content[]
  ideas: Idea[]
  clusters: IdeaCluster[]
  research: ResearchItem[]
  assets: Asset[]
  revenueSources: RevenueSource[]
  revenueEntries: RevenueEntry[]
  expenses: Expense[]
  deals: BrandDeal[]
  invoices: Invoice[]
  audience: AudienceSnapshot[]
  demographics: Demographics
  metrics: MetricSample[]
  brand: BrandSystem
  templates: Template[]
  notifications: Notification[]
  /** Every ISO day in the modelled window, oldest first. */
  dayKeys: string[]
  todayKey: string
  /**
   * Per-content daily attribution. This is what makes scoped analytics honest:
   * when the global filter bar narrows to a topic, series or campaign, charts
   * are built from the attributed subset — and therefore reconcile exactly with
   * the content table beside them.
   */
  contentSeries: Record<string, ContentDayPoint[]>
  generatedAt: string
}

export interface ContentDayPoint {
  date: string
  views: number
  reach: number
  engagements: number
  watchMinutes: number
  followersGained: number
  revenue: number
}
