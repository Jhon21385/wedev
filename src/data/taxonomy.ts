import type { Campaign, IdeaCluster, Series, Topic } from './types'

/* ============================================================================
   TOPIC TREE — parents are pillars, children are working topics.
   The tree powers the Research Map and the topic drill-through in Analytics.
   ========================================================================== */
export const TOPICS: Topic[] = [
  // Pillar roots
  { id: 't-ai', name: 'AI & Agents', parentId: null, color: '#5B9DFF', pillar: 'ai', description: 'Applied AI, agent architecture and model economics.' },
  { id: 't-dev', name: 'Engineering', parentId: null, color: '#A78BFA', pillar: 'dev', description: 'Shipping software fast without accruing debt.' },
  { id: 't-biz', name: 'Creator Business', parentId: null, color: '#34D399', pillar: 'biz', description: 'Turning attention into a durable business.' },
  { id: 't-career', name: 'Market & Career', parentId: null, color: '#FBBF24', pillar: 'career', description: 'Where the work is going, and what to learn next.' },

  // AI branch
  { id: 't-agents', name: 'AI Agents', parentId: 't-ai', color: '#5B9DFF', pillar: 'ai', description: 'Autonomous tool-using systems.' },
  { id: 't-rag', name: 'Retrieval & Context', parentId: 't-ai', color: '#38D6F5', pillar: 'ai', description: 'RAG, embeddings, context engineering.' },
  { id: 't-models', name: 'Models & Evals', parentId: 't-ai', color: '#7C5CF5', pillar: 'ai', description: 'Choosing, measuring and shipping models.' },
  { id: 't-aiwork', name: 'AI Workflows', parentId: 't-ai', color: '#2DD4BF', pillar: 'ai', description: 'Practical automation of knowledge work.' },
  { id: 't-aistack', name: 'The AI Stack', parentId: 't-ai', color: '#8CBCFF', pillar: 'ai', description: 'Tools, vendors and price-per-token reality.' },
  { id: 't-aiframework', name: 'Frameworks', parentId: 't-ai', color: '#6EA8FF', pillar: 'ai', description: 'LangChain, LlamaIndex and the framework question.' },

  // Engineering branch
  { id: 't-shipping', name: 'Shipping Fast', parentId: 't-dev', color: '#A78BFA', pillar: 'dev', description: 'Velocity without chaos.' },
  { id: 't-arch', name: 'Architecture', parentId: 't-dev', color: '#7C5CF5', pillar: 'dev', description: 'Boring choices that survive scale.' },
  { id: 't-product', name: 'Product Design', parentId: 't-dev', color: '#D976FF', pillar: 'dev', description: 'Interfaces for intelligent products.' },
  { id: 't-datastack', name: 'Data & Infra', parentId: 't-dev', color: '#38D6F5', pillar: 'dev', description: 'Postgres, queues, observability.' },

  // Creator business branch
  { id: 't-growth', name: 'Audience Growth', parentId: 't-biz', color: '#34D399', pillar: 'biz', description: 'Distribution that compounds.' },
  { id: 't-monetise', name: 'Monetisation', parentId: 't-biz', color: '#22C55E', pillar: 'biz', description: 'Deals, products, pricing.' },
  { id: 't-ops', name: 'Creator Ops', parentId: 't-biz', color: '#FBBF24', pillar: 'biz', description: 'Systems and pipelines for solo operators.' },
  { id: 't-craft', name: 'Content Craft', parentId: 't-biz', color: '#FB923C', pillar: 'biz', description: 'Hooks, retention, editing.' },
  { id: 't-startups', name: 'Startups', parentId: 't-biz', color: '#2DD4BF', pillar: 'biz', description: 'Building companies in public.' },

  // Career branch
  { id: 't-skills', name: 'Skills', parentId: 't-career', color: '#FBBF24', pillar: 'career', description: 'What to learn and in what order.' },
  { id: 't-focus', name: 'Focus & Systems', parentId: 't-career', color: '#FB7185', pillar: 'career', description: 'Attention as the scarce resource.' },
  { id: 't-market', name: 'Industry Shift', parentId: 't-career', color: '#38D6F5', pillar: 'career', description: 'India, hiring and the AI labour market.' },
]

export const topicById = (id: string) => TOPICS.find((t) => t.id === id) ?? TOPICS[0]
export const rootTopics = TOPICS.filter((t) => t.parentId === null)
export const childTopics = (id: string) => TOPICS.filter((t) => t.parentId === id)

export const PILLARS = [
  { id: 'ai', name: 'AI & Agents', color: '#5B9DFF' },
  { id: 'dev', name: 'Engineering', color: '#A78BFA' },
  { id: 'biz', name: 'Creator Business', color: '#34D399' },
  { id: 'career', name: 'Market & Career', color: '#FBBF24' },
]

/* ============================================================================
   SERIES — recurring formats the audience subscribes to
   ========================================================================== */
export const SERIES: Series[] = [
  { id: 's-buildinpublic', name: 'Building in Public', color: '#34D399', cadence: 'Weekly · Friday', contentIds: [] },
  { id: 's-teardown', name: 'AI Teardowns', color: '#5B9DFF', cadence: 'Bi-weekly · Tuesday', contentIds: [] },
  { id: 's-fromzero', name: 'From Zero', color: '#A78BFA', cadence: 'Monthly', contentIds: [] },
  { id: 's-desk', name: 'From My Desk', color: '#FBBF24', cadence: 'Weekly · Tuesday', contentIds: [] },
  { id: 's-honest', name: 'The Honest Numbers', color: '#FB7185', cadence: 'Monthly', contentIds: [] },
]

/* ============================================================================
   CAMPAIGNS
   ========================================================================== */
export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c-ai30',
    name: 'AI in 30 Days',
    objective: 'Own the practical-AI search space with 30 days of daily shipping content.',
    start: '',
    end: '',
    budget: 4200,
    spend: 2860,
    status: 'active',
    color: '#5B9DFF',
    contentIds: [],
    kpiLabel: 'Subscribers added',
    kpiTarget: 12000,
    kpiActual: 8340,
  },
  {
    id: 'c-launch',
    name: 'AgentKit Launch',
    objective: 'Drive 2,000 waitlist signups for the course in pre-launch.',
    brandId: 'b-vercelish',
    start: '',
    end: '',
    budget: 9500,
    spend: 6180,
    status: 'active',
    color: '#A78BFA',
    contentIds: [],
    kpiLabel: 'Waitlist signups',
    kpiTarget: 2000,
    kpiActual: 1462,
  },
  {
    id: 'c-india',
    name: "India's AI Decade",
    objective: 'Build a documentary-grade series on AI adoption across Indian businesses.',
    start: '',
    end: '',
    budget: 12000,
    spend: 3120,
    status: 'planning',
    color: '#38D6F5',
    contentIds: [],
    kpiLabel: 'Watch time (hrs)',
    kpiTarget: 90000,
    kpiActual: 12400,
  },
  {
    id: 'c-newsletter',
    name: 'The Build Log Growth',
    objective: 'Cross 50,000 newsletter subscribers using YouTube as top of funnel.',
    start: '',
    end: '',
    budget: 1800,
    spend: 1800,
    status: 'wrapped',
    color: '#34D399',
    contentIds: [],
    kpiLabel: 'Subscribers',
    kpiTarget: 50000,
    kpiActual: 52400,
  },
  {
    id: 'c-linkedin',
    name: 'LinkedIn Authority Push',
    objective: 'Daily LinkedIn cadence to convert hiring managers and SMB founders.',
    start: '',
    end: '',
    budget: 600,
    spend: 240,
    status: 'active',
    color: '#4DA3FF',
    contentIds: [],
    kpiLabel: 'Inbound leads',
    kpiTarget: 120,
    kpiActual: 71,
  },
]

/* ============================================================================
   IDEA CLUSTERS
   ========================================================================== */
export const CLUSTERS: IdeaCluster[] = [
  { id: 'k-agents', name: 'Agent playbooks', description: 'Build-along agent content the audience can copy.', color: '#5B9DFF', topicId: 't-agents' },
  { id: 'k-cost', name: 'AI cost reality', description: 'Token economics, hosting bills, ROI teardowns.', color: '#38D6F5', topicId: 't-aistack' },
  { id: 'k-nocode', name: 'No-code automation', description: 'Automation for non-developers.', color: '#2DD4BF', topicId: 't-aiwork' },
  { id: 'k-money', name: 'Creator money', description: 'Revenue, pricing and deal mechanics.', color: '#34D399', topicId: 't-monetise' },
  { id: 'k-craft', name: 'Craft notes', description: 'Hooks, retention, editing technique.', color: '#FB923C', topicId: 't-craft' },
  { id: 'k-india', name: 'India shift', description: 'On-the-ground AI adoption stories.', color: '#A78BFA', topicId: 't-market' },
  { id: 'k-solo', name: 'Solo systems', description: 'Operating a one-person company.', color: '#FBBF24', topicId: 't-ops' },
  { id: 'k-contrarian', name: 'Contrarian takes', description: 'Ideas that challenge the default narrative.', color: '#FB7185', topicId: 't-market' },
]

export const clusterById = (id: string) => CLUSTERS.find((c) => c.id === id) ?? CLUSTERS[0]
export const campaignById = (id?: string) => (id ? CAMPAIGNS.find((c) => c.id === id) : undefined)
export const seriesById = (id?: string) => (id ? SERIES.find((s) => s.id === id) : undefined)
