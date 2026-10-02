import type { RevenueSource } from '../types'

/* ============================================================================
   CREATOR BUSINESS
   Revenue is modelled as a source registry + entries, so adding a custom
   source (course, licensing, crowdfunding) is data entry, not a migration.
   ========================================================================== */
export const REVENUE_SOURCES: RevenueSource[] = [
  { id: 'r-yt', name: 'YouTube Ads', color: '#FF5A5A', category: 'platform', enabled: true },
  { id: 'r-yt-member', name: 'Memberships', color: '#FF8A8A', category: 'platform', enabled: true },
  { id: 'r-brand', name: 'Brand Deals', color: '#5B9DFF', category: 'direct', enabled: true },
  { id: 'r-aff', name: 'Affiliate', color: '#38D6F5', category: 'platform', enabled: true },
  { id: 'r-prod', name: 'Digital Products', color: '#A78BFA', category: 'product', enabled: true },
  { id: 'r-consult', name: 'Consulting', color: '#34D399', category: 'direct', enabled: true },
  { id: 'r-course', name: 'Course — AgentKit', color: '#7C5CF5', category: 'product', enabled: true },
  { id: 'r-speak', name: 'Speaking', color: '#FBBF24', category: 'other', enabled: true },
  { id: 'r-licence', name: 'Content Licensing', color: '#2DD4BF', category: 'other', enabled: true, custom: true },
]

/** Monthly shape multipliers — August is the anniversary spike, January dips. */
export const MONTH_WEIGHTS = [0.82, 0.76, 0.94, 1.0, 1.06, 1.12, 1.04, 1.28, 1.14, 1.09, 1.18, 0.96]

/** Baseline monthly revenue per source, before growth trend is applied. */
export const SOURCE_BASE: Record<string, number> = {
  'r-yt': 2100,
  'r-yt-member': 480,
  'r-brand': 3400,
  'r-aff': 620,
  'r-prod': 900,
  'r-consult': 2600,
  'r-course': 1450,
  'r-speak': 700,
  'r-licence': 300,
}

/* --- Deals ---------------------------------------------------------------- */
export interface DealSeed {
  id: string
  brand: string
  campaign: string
  industry: string
  contact: string
  /** Days from today. Negative = in the past. */
  deadlineOffset: number
  fee: number
  status: 'prospect' | 'negotiating' | 'signed' | 'in-production' | 'delivered' | 'paid' | 'lost'
  paymentStatus: 'unpaid' | 'deposit' | 'invoiced' | 'paid' | 'overdue'
  color: string
  notes: string
  deliverables: { label: string; done: boolean; dueOffset: number }[]
  performance?: { reach: number; engagements: number; cpm: number; contentIds: string[] }
}

export const DEALS: DealSeed[] = [
  {
    id: 'dl-01',
    brand: 'Northwind AI',
    campaign: 'Agent Platform Launch — Q4',
    industry: 'Developer tools',
    contact: 'Rhea Kapoor · Partnerships',
    deadlineOffset: 12,
    fee: 48000,
    status: 'in-production',
    paymentStatus: 'deposit',
    color: '#5B9DFF',
    notes: 'Highest-value deal of the year. Two-video package with a 60-day exclusivity window. Legal has approved the claims list.',
    deliverables: [
      { label: 'Integration video (12–16 min)', done: true, dueOffset: -4 },
      { label: '2× Shorts cut-downs', done: false, dueOffset: 3 },
      { label: 'LinkedIn case study post', done: false, dueOffset: 6 },
      { label: 'Usage rights — 12 months', done: false, dueOffset: 12 },
    ],
    performance: { reach: 0, engagements: 0, cpm: 0, contentIds: ['ct-pipeline'] },
  },
  {
    id: 'dl-02',
    brand: 'Cloudline',
    campaign: 'Postgres 18 Awareness',
    industry: 'Infrastructure',
    contact: 'Marcus Bell · DevRel lead',
    deadlineOffset: -18,
    fee: 22000,
    status: 'paid',
    paymentStatus: 'paid',
    color: '#34D399',
    notes: 'Delivered early. Best performing sponsored integration to date — 3.1× the promised reach.',
    deliverables: [
      { label: 'Dedicated video', done: true, dueOffset: -30 },
      { label: 'Docs walkthrough segment', done: true, dueOffset: -26 },
      { label: 'Community Q&A thread', done: true, dueOffset: -18 },
    ],
    performance: { reach: 412_000, engagements: 31_400, cpm: 53.4, contentIds: ['ct-postgres'] },
  },
  {
    id: 'dl-03',
    brand: 'Vanta Labs',
    campaign: 'AI Eval Suite',
    industry: 'AI tooling',
    contact: 'Sofia Lindqvist · Growth',
    deadlineOffset: 26,
    fee: 31000,
    status: 'signed',
    paymentStatus: 'unpaid',
    color: '#A78BFA',
    notes: 'Signed. Script due in 9 days. Requires a genuine hands-on eval section — no scripted praise.',
    deliverables: [
      { label: 'Teardown video (18–22 min)', done: false, dueOffset: 14 },
      { label: 'Newsletter feature', done: false, dueOffset: 20 },
      { label: '3× Reels', done: false, dueOffset: 26 },
    ],
  },
  {
    id: 'dl-04',
    brand: 'Ledgerly',
    campaign: 'Creator Finance Suite',
    industry: 'Fintech',
    contact: 'Tomás Ferreira · Brand',
    deadlineOffset: 5,
    fee: 14500,
    status: 'delivered',
    paymentStatus: 'invoiced',
    color: '#FBBF24',
    notes: 'Delivered 2 days ago. Invoice sent, net-30 terms. Follow up on day 28.',
    deliverables: [
      { label: 'Integration segment', done: true, dueOffset: -2 },
      { label: 'LinkedIn carousel', done: true, dueOffset: 1 },
      { label: 'Story set (5 frames)', done: true, dueOffset: 4 },
    ],
    performance: { reach: 186_000, engagements: 12_900, cpm: 78.0, contentIds: ['ct-li-automations'] },
  },
  {
    id: 'dl-05',
    brand: 'Kite Systems',
    campaign: 'Agent Memory SDK',
    industry: 'Developer tools',
    contact: 'Ananya Rao · Founder',
    deadlineOffset: 41,
    fee: 20000,
    status: 'negotiating',
    paymentStatus: 'unpaid',
    color: '#38D6F5',
    notes: 'They opened at $12k. Counter at $20k + performance bonus. They are price-sensitive but the fit is excellent.',
    deliverables: [
      { label: 'Technical deep-dive video', done: false, dueOffset: 30 },
      { label: 'Docs contribution', done: false, dueOffset: 41 },
    ],
  },
  {
    id: 'dl-06',
    brand: 'Helio Health',
    campaign: 'Clinician Automation',
    industry: 'Healthcare',
    contact: 'Dr. Nandita Iyer · Chief of Staff',
    deadlineOffset: -46,
    fee: 18000,
    status: 'paid',
    paymentStatus: 'paid',
    color: '#2DD4BF',
    notes: 'Regulated-industry review added 11 days to the timeline. Worth it — the compliance angle performed well.',
    deliverables: [
      { label: 'Documentary segment', done: true, dueOffset: -60 },
      { label: 'Compliance review pass', done: true, dueOffset: -50 },
      { label: 'LinkedIn case study', done: true, dueOffset: -46 },
    ],
    performance: { reach: 224_000, engagements: 18_200, cpm: 80.4, contentIds: ['ct-casestudy'] },
  },
  {
    id: 'dl-07',
    brand: 'Orbital Dev',
    campaign: 'CI/CD for AI Teams',
    industry: 'Developer tools',
    contact: 'Priyansh Mehta · Marketing',
    deadlineOffset: -70,
    fee: 9000,
    status: 'lost',
    paymentStatus: 'unpaid',
    color: '#FB7185',
    notes: 'Lost on price to a larger channel. Their brief also wanted script approval rights, which is a policy I do not break.',
    deliverables: [],
  },
  {
    id: 'dl-08',
    brand: 'Beacon Analytics',
    campaign: 'Creator Data Platform',
    industry: 'Analytics',
    contact: 'Yuki Tanaka · Partnerships',
    deadlineOffset: 54,
    fee: 36000,
    status: 'prospect',
    paymentStatus: 'unpaid',
    color: '#D976FF',
    notes: 'Inbound from the analytics video. They want a 3-part series. Strong strategic fit — their tool is one I would use anyway.',
    deliverables: [
      { label: 'Series of 3 videos', done: false, dueOffset: 44 },
      { label: 'Live workshop', done: false, dueOffset: 54 },
    ],
  },
]

/* --- Invoices ------------------------------------------------------------- */
export const INVOICES = [
  { id: 'inv-01', number: 'COS-2026-041', dealId: 'dl-04', brand: 'Ledgerly', amount: 14500, issuedOffset: -2, dueOffset: 28, status: 'sent' as const },
  { id: 'inv-02', number: 'COS-2026-040', dealId: 'dl-02', brand: 'Cloudline', amount: 22000, issuedOffset: -48, dueOffset: -18, status: 'paid' as const },
  { id: 'inv-03', number: 'COS-2026-039', dealId: 'dl-06', brand: 'Helio Health', amount: 18000, issuedOffset: -76, dueOffset: -46, status: 'paid' as const },
  { id: 'inv-04', number: 'COS-2026-038', dealId: 'dl-01', brand: 'Northwind AI', amount: 24000, issuedOffset: -22, dueOffset: 8, status: 'sent' as const },
  { id: 'inv-05', number: 'COS-2026-037', dealId: 'dl-06', brand: 'Helio Health', amount: 6000, issuedOffset: -110, dueOffset: -80, status: 'overdue' as const },
  { id: 'inv-06', number: 'COS-2026-042', dealId: 'dl-03', brand: 'Vanta Labs', amount: 31000, issuedOffset: 0, dueOffset: 30, status: 'draft' as const },
]

/* --- Expenses ------------------------------------------------------------- */
export const EXPENSES = [
  { id: 'ex-01', category: 'Software', description: 'Adobe Creative Cloud', monthly: 82, offset: -1 },
  { id: 'ex-02', category: 'Software', description: 'AI API credits (all providers)', monthly: 340, offset: -1 },
  { id: 'ex-03', category: 'Software', description: 'Hosting + storage (video archive)', monthly: 148, offset: -1 },
  { id: 'ex-04', category: 'Team', description: 'Editor retainer — 12 hrs/week', monthly: 1600, offset: -1 },
  { id: 'ex-05', category: 'Team', description: 'Thumbnail designer', monthly: 420, offset: -1 },
  { id: 'ex-06', category: 'Equipment', description: 'Lens rental + studio day', monthly: 260, offset: -1 },
  { id: 'ex-07', category: 'Marketing', description: 'Newsletter sponsorship swap', monthly: 180, offset: -1 },
  { id: 'ex-08', category: 'Admin', description: 'Accounting + legal', monthly: 310, offset: -1 },
  { id: 'ex-09', category: 'Education', description: 'Research subscriptions', monthly: 96, offset: -1 },
  { id: 'ex-10', category: 'Travel', description: 'India field reporting', monthly: 0, offset: -1, oneOff: 1840 },
]

/* --- Campaign-linked contract pipeline ----------------------------------- */
export const CONTRACT_PIPELINE = [
  { label: 'Prospecting', value: 36000, count: 1, color: '#6A7284' },
  { label: 'Negotiating', value: 20000, count: 1, color: '#FBBF24' },
  { label: 'Signed', value: 31000, count: 1, color: '#5B9DFF' },
  { label: 'In production', value: 48000, count: 1, color: '#A78BFA' },
  { label: 'Delivered', value: 14500, count: 1, color: '#2DD4BF' },
  { label: 'Paid', value: 40000, count: 2, color: '#34D399' },
]
