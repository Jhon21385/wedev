import type { BrandSystem, Notification } from '../types'

/* ============================================================================
   BRAND SYSTEM
   A miniature brand OS: palette, type, voice, pillars, CTA patterns, visual
   rules and references — all wired to the content pipeline.
   ========================================================================== */
export const BRAND: BrandSystem = {
  name: 'Aarav Menon',
  tagline: 'Build fast. Explain honestly.',
  mission:
    'Help working developers ship production AI without the hype cycle — using real numbers, real failures and systems you can copy the same afternoon.',
  voice: [
    { trait: 'Specific over clever', do: 'Quote the actual figure — $11 in tokens, 9 days, 74% of the code.', dont: 'Say "significantly cheaper" or "much faster".' },
    { trait: 'Publish the failure', do: 'Lead with the mistake and what it cost.', dont: 'Bury the failure under a success story.' },
    { trait: 'Teach the decision', do: 'Explain the trade-off that led to the choice.', dont: 'Present one tool as objectively correct.' },
    { trait: 'Short sentences', do: 'One idea per line. Let it breathe on screen.', dont: 'Stack three clauses with em-dashes.' },
    { trait: 'Respect the viewer', do: 'Assume competence. Skip the preamble.', dont: 'Explain what a variable is.' },
  ],
  pillars: [
    { id: 'p-agents', name: 'Agent engineering', weight: 34, color: '#5B9DFF', description: 'Architecture, tools, memory, evals. The technical core.' },
    { id: 'p-business', name: 'Creator business', weight: 24, color: '#34D399', description: 'Deals, pricing, products, the money side done openly.' },
    { id: 'p-craft', name: 'Craft & systems', weight: 20, color: '#FB923C', description: 'Hooks, retention, pipelines, operating rhythm.' },
    { id: 'p-market', name: 'Market shift', weight: 14, color: '#38D6F5', description: 'India, hiring, adoption — the ground truth on the ground.' },
    { id: 'p-career', name: 'Career', weight: 8, color: '#FBBF24', description: 'What to learn, in what order, and why.' },
  ],
  ctas: [
    { id: 'c1', label: 'Newsletter', text: 'The full breakdown lands in The Build Log every Thursday. Free, no upsell.', use: 'Default end-card CTA on long form.', performance: 4.7 },
    { id: 'c2', label: 'Comment prompt', text: 'Tell me what broke first when you tried this. I read every one.', use: 'Technical videos where the comments become content.', performance: 4.2 },
    { id: 'c3', label: 'Download', text: 'Eval harness and tool schemas are in the description — run them on your own data.', use: 'Build-along videos.', performance: 4.4 },
    { id: 'c4', label: 'Email me', text: 'If you are building inside an Indian company, email me. I want your story in the next film.', use: 'Documentary and field-report videos.', performance: 3.9 },
    { id: 'c5', label: 'Save prompt', text: 'Save this before your next build. You will need slide 4.', use: 'Carousels and Reels.', performance: 4.6 },
  ],
  thumbnailStyle: [
    { rule: 'One face, one object', detail: 'Never two focal points. The face carries emotion; the object carries context.' },
    { rule: 'Three words maximum', detail: 'Verb-led: "IT BROKE" beats "AI Agent Failure Analysis".' },
    { rule: 'Contrast ratio above 7:1', detail: 'Tested at 120px width. If it muddies at 120px, it fails.' },
    { rule: 'No arrow overlays', detail: 'Red circles and arrows read as low-effort. Use lighting instead.' },
    { rule: 'Cool background, warm subject', detail: 'The ambient blue identity carries into the thumbnail grade.' },
  ],
  captionStyle: [
    { rule: 'Hook in the first line, no preamble', detail: 'LinkedIn truncates at ~140 characters. Earn the "see more".' },
    { rule: 'One insight per line break', detail: 'White space is the primary formatting tool.' },
    { rule: 'Number the list, keep it odd', detail: 'Three, five or seven items. Never ten.' },
    { rule: 'No hashtag walls', detail: 'Maximum three, all at the end, all specific.' },
    { rule: 'Close with a real question', detail: 'Not "thoughts?" — ask a question you would answer yourself.' },
  ],
  assets: [
    { id: 'ba-01', kind: 'logo', name: 'Primary wordmark', value: 'creator-os-wordmark.svg', role: 'Video end cards, newsletter header' },
    { id: 'ba-02', kind: 'logo', name: 'Monogram', value: 'creator-os-mark-glow.svg', role: 'Avatar, watermark, lower third' },
  ],
  palette: [
    { name: 'Cockpit black', hex: '#09090B', role: 'Video background, lower thirds' },
    { name: 'Signal blue', hex: '#5B9DFF', role: 'Primary accent, data highlight, links' },
    { name: 'Ice', hex: '#8CBCFF', role: 'Hover state, secondary data series' },
    { name: 'Deep blue', hex: '#2F6FD0', role: 'Pressed state, chart fills' },
    { name: 'Violet', hex: '#A78BFA', role: 'Engagement series, callouts' },
    { name: 'Emerald', hex: '#34D399', role: 'Growth, positive delta, revenue' },
    { name: 'Amber', hex: '#FBBF24', role: 'In-progress, attention, warnings' },
    { name: 'Rose', hex: '#FB7185', role: 'Risk, decline, lost deals' },
  ],
  type: [
    { name: 'Inter Variable', usage: 'Everything on screen — UI, captions, lower thirds', weight: '400 / 560 / 700', sample: 'Ship the decision' },
    { name: 'JetBrains Mono', usage: 'Code, metrics, timestamps, technical labels', weight: '400 / 500', sample: '128,420 views' },
  ],
  references: [
    { id: 'br-01', label: 'Cinematic control rooms', note: 'Near-black surfaces, hairline separations, one accent per surface.', seed: 901 },
    { id: 'br-02', label: 'Editorial data journalism', note: 'Annotated charts. Direct labels instead of legend hunting.', seed: 902 },
    { id: 'br-03', label: 'Indian street photography', note: 'Warm subject against cool city light. Applies to thumbnails and docs.', seed: 903 },
    { id: 'br-04', label: 'Technical documentation', note: 'Monospaced precision for anything numeric. No decorative type.', seed: 904 },
  ],
}

/* ============================================================================
   SYSTEM NOTIFICATIONS
   ========================================================================== */
export const NOTIFICATIONS: Omit<Notification, 'at'>[] = [
  {
    id: 'n1',
    kind: 'deadline',
    title: 'Brand film is 3 days overdue',
    body: 'Northwind AI expects the sponsored case study on Friday. Production is at 40%.',
    read: false,
    href: '/content/ct-overdue',
    severity: 'critical',
  },
  {
    id: 'n2',
    kind: 'trend',
    title: 'Spike detected: "agent memory"',
    body: 'Search interest is up 61% week over week and you have a video in scripting on exactly this.',
    read: false,
    href: '/analytics',
    severity: 'positive',
  },
  {
    id: 'n3',
    kind: 'deal',
    title: 'Vanta Labs signed — $31,000',
    body: 'Teardown video due in 14 days. Script approval not required.',
    read: false,
    href: '/revenue',
    severity: 'positive',
  },
  {
    id: 'n4',
    kind: 'system',
    title: 'LinkedIn token expires in 6 days',
    body: 'Reconnect to keep impression data flowing into analytics. Two weeks of partial data otherwise.',
    read: false,
    href: '/settings',
    severity: 'warn',
  },
  {
    id: 'n5',
    kind: 'milestone',
    title: 'YouTube crossed 250,000 subscribers',
    body: 'Reached during the India documentary. Fastest 10k the channel has ever added.',
    read: true,
    href: '/audience',
    severity: 'positive',
  },
  {
    id: 'n6',
    kind: 'comment',
    title: 'Comment volume up 3.2× on the agent video',
    body: '1,284 new comments in 48 hours. 34% are permission requests — strong signal for a follow-up.',
    read: true,
    href: '/content/ct-agent',
    severity: 'info',
  },
  {
    id: 'n7',
    kind: 'deadline',
    title: 'Build Log #12 sends in 2 days',
    body: 'Still two sections short and the architecture download link is unverified.',
    read: false,
    href: '/content/ct-newsletter-12',
    severity: 'warn',
  },
  {
    id: 'n8',
    kind: 'system',
    title: 'Storage at 82%',
    body: '3.1 TB of raw footage. Archive the 2024 project folders to free 900 GB.',
    read: true,
    href: '/assets',
    severity: 'warn',
  },
]
