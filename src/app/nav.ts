import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDot,
  Database,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  Palette,
  PenLine,
  Rocket,
  Settings,
  Sparkles,
  Users,
  Wallet,
  Archive,
} from 'lucide-react'

/* ============================================================================
   NAVIGATION MODEL
   Two groups only. The PRIMARY group is the product surface; WORKSPACE holds
   saved views over the same content graph, which is why they carry counts.
   ========================================================================== */

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  shortcut?: string
  /** Optional live count resolved at render time. */
  countKey?: 'inbox' | 'ideas' | 'drafts' | 'production' | 'published' | 'archive'
  badge?: 'glow'
}

export const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard, shortcut: 'D' },
  { id: 'content', label: 'Content', href: '/content', icon: Database, shortcut: 'C' },
  { id: 'compose', label: 'Compose', href: '/compose', icon: PenLine, badge: 'glow' },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { id: 'research', label: 'Research', href: '/research', icon: FlaskConical },
  { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3, shortcut: 'A' },
  { id: 'audience', label: 'Audience', href: '/audience', icon: Users },
  { id: 'revenue', label: 'Revenue', href: '/revenue', icon: Wallet },
  { id: 'assets', label: 'Assets', href: '/assets', icon: Boxes },
  { id: 'brand', label: 'Brand', href: '/brand', icon: Palette },
]

export const WORKSPACE_NAV: NavItem[] = [
  { id: 'inbox', label: 'Inbox', href: '/inbox', icon: Inbox, countKey: 'inbox', badge: 'glow' },
  { id: 'ideas', label: 'Ideas', href: '/ideas', icon: Lightbulb, shortcut: 'I', countKey: 'ideas' },
  { id: 'drafts', label: 'Drafts', href: '/content?view=table&status=idea,research,brief,scripting', icon: PenLine, countKey: 'drafts' },
  { id: 'production', label: 'In Production', href: '/content?view=board&status=production,editing,review,ready', icon: Rocket, countKey: 'production' },
  { id: 'published', label: 'Published', href: '/content?view=table&status=published', icon: CircleDot, countKey: 'published' },
  { id: 'archive', label: 'Archive', href: '/content?view=table&status=archived', icon: Archive, countKey: 'archive' },
]

export const UTILITY_NAV: NavItem[] = [
  { id: 'workflow', label: 'Workflow', href: '/workflow', icon: Sparkles },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
]

export const ALL_NAV = [...PRIMARY_NAV, ...WORKSPACE_NAV, ...UTILITY_NAV]

export const BREADCRUMB_MAP: Record<string, string> = {
  '': 'Dashboard',
  content: 'Content',
  compose: 'Compose',
  calendar: 'Calendar',
  research: 'Research',
  analytics: 'Analytics',
  audience: 'Audience',
  revenue: 'Revenue',
  assets: 'Assets',
  brand: 'Brand',
  ideas: 'Ideas',
  inbox: 'Inbox',
  workflow: 'Workflow',
  settings: 'Settings',
}
