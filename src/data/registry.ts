import type { ContentFormatId, ContentStatusId, ContentTypeDef, MetricDef, MetricId, Platform, PlatformId, StatusDef } from './types'

/* ============================================================================
   PLATFORMS
   Live platforms render everywhere. Planned platforms are fully specified so
   support is a one-line `status` flip — but they are filtered out of the UI.
   ========================================================================== */
export const PLATFORMS: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    short: 'YT',
    status: 'live',
    color: '#FF5A5A',
    glow: 'rgba(255,90,90,0.34)',
    metricLabel: 'Views',
    audienceLabel: 'Subscribers',
    connected: true,
    handle: '@buildwithaarav',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    short: 'IG',
    status: 'live',
    color: '#D976FF',
    glow: 'rgba(217,118,255,0.32)',
    metricLabel: 'Reach',
    audienceLabel: 'Followers',
    connected: true,
    handle: '@aarav.builds',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    short: 'LI',
    status: 'live',
    color: '#4DA3FF',
    glow: 'rgba(77,163,255,0.32)',
    metricLabel: 'Impressions',
    audienceLabel: 'Followers',
    connected: true,
    handle: 'in/aaravmenon',
  },
  {
    id: 'x',
    name: 'X',
    short: 'X',
    status: 'planned',
    color: '#9BA3B4',
    glow: 'rgba(155,163,180,0.3)',
    metricLabel: 'Impressions',
    audienceLabel: 'Followers',
    connected: false,
    handle: '@aaravmenon',
  },
  {
    id: 'threads',
    name: 'Threads',
    short: 'TH',
    status: 'planned',
    color: '#9BA3B4',
    glow: 'rgba(155,163,180,0.3)',
    metricLabel: 'Views',
    audienceLabel: 'Followers',
    connected: false,
    handle: '@aarav.builds',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    short: 'TT',
    status: 'planned',
    color: '#9BA3B4',
    glow: 'rgba(155,163,180,0.3)',
    metricLabel: 'Views',
    audienceLabel: 'Followers',
    connected: false,
    handle: '@aarav.builds',
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    short: 'NL',
    status: 'planned',
    color: '#34D399',
    glow: 'rgba(52,211,153,0.3)',
    metricLabel: 'Opens',
    audienceLabel: 'Subscribers',
    connected: false,
    handle: 'the-build-log',
  },
  {
    id: 'podcast',
    name: 'Podcast',
    short: 'PC',
    status: 'planned',
    color: '#FBBF24',
    glow: 'rgba(251,191,36,0.3)',
    metricLabel: 'Downloads',
    audienceLabel: 'Listeners',
    connected: false,
    handle: 'Shipping Notes',
  },
  {
    id: 'blog',
    name: 'Blog',
    short: 'BL',
    status: 'planned',
    color: '#38D6F5',
    glow: 'rgba(56,214,245,0.3)',
    metricLabel: 'Sessions',
    audienceLabel: 'Readers',
    connected: false,
    handle: 'aarav.dev',
  },
]

export const LIVE_PLATFORMS = PLATFORMS.filter((p) => p.status === 'live')
export const LIVE_PLATFORM_IDS = LIVE_PLATFORMS.map((p) => p.id)

export const platformById = (id: PlatformId) =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0]

/* ============================================================================
   CONTENT STATUSES — the spine of the pipeline
   ========================================================================== */
export const STATUSES: StatusDef[] = [
  { id: 'idea', name: 'Idea', order: 0, accent: '#6A7284' },
  { id: 'research', name: 'Research', order: 1, accent: '#38D6F5' },
  { id: 'brief', name: 'Brief', order: 2, accent: '#2DD4BF' },
  { id: 'scripting', name: 'Scripting', order: 3, accent: '#A78BFA' },
  { id: 'production', name: 'Production', order: 4, accent: '#7C5CF5' },
  { id: 'editing', name: 'Editing', order: 5, accent: '#FBBF24' },
  { id: 'review', name: 'Review', order: 6, accent: '#FB923C' },
  { id: 'ready', name: 'Ready', order: 7, accent: '#34D399' },
  { id: 'scheduled', name: 'Scheduled', order: 8, accent: '#5B9DFF' },
  { id: 'published', name: 'Published', order: 9, accent: '#22C55E', terminal: true },
  { id: 'archived', name: 'Archived', order: 10, accent: '#474E5D', terminal: true },
]

export const statusById = (id: string) => STATUSES.find((s) => s.id === id) ?? STATUSES[0]

/** Production stages shown in the dashboard pipeline widget. */
export const PIPELINE_STAGES: ContentStatusId[] = [
  'idea',
  'research',
  'scripting',
  'production',
  'editing',
  'ready',
  'published',
]

/* ============================================================================
   CONTENT FORMATS
   ========================================================================== */
export const FORMATS: { id: ContentFormatId; name: string; short: string; effort: number }[] = [
  { id: 'long-form', name: 'Long form', short: 'Long', effort: 14 },
  { id: 'short', name: 'Short form', short: 'Short', effort: 3 },
  { id: 'reel', name: 'Reel', short: 'Reel', effort: 3.5 },
  { id: 'carousel', name: 'Carousel', short: 'Carousel', effort: 4 },
  { id: 'text', name: 'Text post', short: 'Text', effort: 1.2 },
  { id: 'story', name: 'Story', short: 'Story', effort: 0.6 },
  { id: 'thread', name: 'Thread', short: 'Thread', effort: 1.5 },
  { id: 'podcast', name: 'Podcast', short: 'Podcast', effort: 9 },
  { id: 'newsletter', name: 'Newsletter', short: 'Letter', effort: 5 },
]

export const formatById = (id: ContentFormatId) => FORMATS.find((f) => f.id === id) ?? FORMATS[1]

/* ============================================================================
   CUSTOM CONTENT TYPES — native types are editable; user types are additive
   ========================================================================== */
export const CONTENT_TYPES: ContentTypeDef[] = [
  {
    id: 'yt-long',
    name: 'YouTube Video',
    icon: 'Youtube',
    format: 'long-form',
    platforms: ['youtube'],
    workflow: ['idea', 'research', 'brief', 'scripting', 'production', 'editing', 'review', 'ready', 'scheduled', 'published'],
    fields: [],
    color: '#FF5A5A',
    description: 'Flagship long-form video with thumbnail, chapters and SEO pass.',
  },
  {
    id: 'yt-short',
    name: 'Short',
    icon: 'Clapperboard',
    format: 'short',
    platforms: ['youtube'],
    workflow: ['idea', 'scripting', 'editing', 'review', 'scheduled', 'published'],
    fields: [],
    color: '#FF5A5A',
    description: 'Vertical discovery asset, normally a derivative of long form.',
  },
  {
    id: 'ig-reel',
    name: 'Instagram Reel',
    icon: 'Instagram',
    format: 'reel',
    platforms: ['instagram'],
    workflow: ['idea', 'scripting', 'editing', 'review', 'scheduled', 'published'],
    fields: [],
    color: '#D976FF',
    description: 'Hook-first vertical video tuned for the Reels graph.',
  },
  {
    id: 'ig-carousel',
    name: 'Carousel',
    icon: 'Layers',
    format: 'carousel',
    platforms: ['instagram'],
    workflow: ['idea', 'research', 'brief', 'scripting', 'production', 'review', 'scheduled', 'published'],
    fields: [],
    color: '#D976FF',
    description: '8–10 slide teaching asset. Save-driven distribution.',
  },
  {
    id: 'li-post',
    name: 'LinkedIn Post',
    icon: 'Linkedin',
    format: 'text',
    platforms: ['linkedin'],
    workflow: ['idea', 'brief', 'scripting', 'review', 'scheduled', 'published'],
    fields: [],
    color: '#4DA3FF',
    description: 'Text-forward post with a strong first line and a teaching arc.',
  },
  {
    id: 'li-doc',
    name: 'Document Post',
    icon: 'FileText',
    format: 'carousel',
    platforms: ['linkedin'],
    workflow: ['idea', 'research', 'brief', 'production', 'review', 'scheduled', 'published'],
    fields: [],
    color: '#4DA3FF',
    description: 'PDF carousel — highest dwell time format on LinkedIn.',
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    icon: 'Mail',
    format: 'newsletter',
    platforms: ['newsletter'],
    workflow: ['idea', 'research', 'brief', 'scripting', 'editing', 'review', 'scheduled', 'published'],
    fields: [
      { id: 'subject_line', label: 'Subject line', type: 'text', placeholder: 'Under 48 characters' },
      { id: 'send_day', label: 'Send day', type: 'select', options: ['Tuesday', 'Wednesday', 'Thursday'] },
    ],
    color: '#34D399',
    custom: true,
    description: 'The Build Log — weekly long-form dispatch.',
  },
  {
    id: 'podcast',
    name: 'Podcast Episode',
    icon: 'Mic',
    format: 'podcast',
    platforms: ['podcast'],
    workflow: ['idea', 'research', 'brief', 'production', 'editing', 'review', 'ready', 'scheduled', 'published'],
    fields: [
      { id: 'guest', label: 'Guest', type: 'text', placeholder: 'Full name + title' },
      { id: 'runtime', label: 'Target runtime (min)', type: 'number', placeholder: '45' },
    ],
    color: '#FBBF24',
    custom: true,
    description: 'Guest interview, later clipped into shorts and Reels.',
  },
  {
    id: 'case-study',
    name: 'Case Study',
    icon: 'FlaskConical',
    format: 'long-form',
    platforms: ['linkedin', 'blog'],
    workflow: ['idea', 'research', 'brief', 'scripting', 'review', 'published'],
    fields: [
      { id: 'client', label: 'Client', type: 'text' },
      { id: 'outcome', label: 'Headline outcome', type: 'text', placeholder: 'e.g. +38% activation' },
    ],
    color: '#2DD4BF',
    custom: true,
    description: 'Deep-dive proof asset for inbound consulting.',
  },
]

export const contentTypeById = (id: string) =>
  CONTENT_TYPES.find((t) => t.id === id) ?? CONTENT_TYPES[0]

/* ============================================================================
   METRIC REGISTRY — one definition drives tables, charts, tooltips, exports
   ========================================================================== */
export const METRICS: MetricDef[] = [
  {
    id: 'views',
    label: 'Views',
    short: 'Views',
    unit: 'count',
    color: '#5B9DFF',
    group: 'reach',
    description: 'Total plays or renders across every surface.',
    agg: 'sum',
  },
  {
    id: 'reach',
    label: 'Reach',
    short: 'Reach',
    unit: 'count',
    color: '#38D6F5',
    group: 'reach',
    description: 'Unique accounts that saw a piece of content.',
    agg: 'sum',
  },
  {
    id: 'impressions',
    label: 'Impressions',
    short: 'Impr.',
    unit: 'count',
    color: '#2DD4BF',
    group: 'reach',
    description: 'Every time content was rendered, including repeats.',
    agg: 'sum',
  },
  {
    id: 'engagements',
    label: 'Engagements',
    short: 'Eng.',
    unit: 'count',
    color: '#A78BFA',
    group: 'engagement',
    description: 'Likes, comments, shares, saves and clicks combined.',
    agg: 'sum',
  },
  {
    id: 'engagementRate',
    label: 'Engagement rate',
    short: 'ER',
    unit: 'percent',
    color: '#FBBF24',
    group: 'engagement',
    description: 'Engagements as a share of reach.',
    agg: 'avg',
  },
  {
    id: 'watchMinutes',
    label: 'Watch time',
    short: 'Watch',
    unit: 'minutes',
    color: '#7C5CF5',
    group: 'engagement',
    description: 'Minutes watched across video surfaces.',
    agg: 'sum',
  },
  {
    id: 'followersGained',
    label: 'Followers gained',
    short: 'Follows',
    unit: 'count',
    color: '#34D399',
    group: 'growth',
    description: 'Net new followers attributed to the period.',
    agg: 'sum',
  },
  {
    id: 'followers',
    label: 'Followers',
    short: 'Audience',
    unit: 'count',
    color: '#34D399',
    group: 'growth',
    description: 'Total audience at the end of the period.',
    agg: 'last',
  },
  {
    id: 'clicks',
    label: 'Link clicks',
    short: 'Clicks',
    unit: 'count',
    color: '#FB7185',
    group: 'engagement',
    description: 'Outbound clicks from descriptions and bios.',
    agg: 'sum',
  },
  {
    id: 'revenue',
    label: 'Revenue',
    short: 'Rev.',
    unit: 'currency',
    color: '#22C55E',
    group: 'business',
    description: 'Attributed revenue across all sources.',
    agg: 'sum',
  },
]

export const metricById = (id: MetricId) => METRICS.find((m) => m.id === id) ?? METRICS[0]

/* Audience baseline at the start of the modelled window. */
export const AUDIENCE_BASELINE: Record<string, number> = {
  youtube: 184_200,
  instagram: 96_400,
  linkedin: 61_800,
}

/** Characters of script per minute of finished video (spoken pace). */
export const WORDS_PER_MINUTE = 155
