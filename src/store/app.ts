import { create } from 'zustand'
import type { Content, ContentTypeDef, PlatformId } from '@/data/types'
import { EMPTY_FILTERS, type FilterState } from '@/analytics/queries'
import type { PeriodPreset } from '@/analytics/periods'
import type { ConnectedAccount, TransportId } from '@/integrations/types'
import { seedLocalState } from '@/integrations/local'

/* ============================================================================
   APPLICATION STATE
   Separation of concerns:
     · `filters`  — the global analytical scope every screen reads
     · `ui`       — ephemeral surface state (panels, palettes, density)
     · `toasts`   — transient confirmations
   Persisted slices are intentionally small and namespace-prefixed.
   ========================================================================== */

export type ToastKind = 'success' | 'info' | 'warn' | 'error'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  body?: string
  action?: { label: string; run: () => void }
}

export type RightPanelKind = 'content' | 'analytics' | 'checklist' | 'research' | 'timeline' | 'breakdown' | 'drill' | 'idea' | null

export interface DrillContext {
  level: 'creator' | 'platform' | 'topic' | 'content'
  platform?: PlatformId
  topicId?: string
  contentId?: string
  label: string
}

interface AppState {
  /* --- filters -------------------------------------------------------- */
  filters: FilterState
  setPeriod: (p: PeriodPreset, from?: string, to?: string) => void
  togglePlatform: (p: PlatformId) => void
  setFilterList: (key: 'typeIds' | 'topicIds' | 'seriesIds' | 'campaignIds' | 'statuses', values: string[]) => void
  toggleFilterValue: (key: 'typeIds' | 'topicIds' | 'seriesIds' | 'campaignIds' | 'statuses', value: string) => void
  clearFilters: () => void
  setFilters: (patch: Partial<FilterState>) => void

  /* --- layout --------------------------------------------------------- */
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  /** Slide-over navigation for phones and tablets, where the rail is hidden. */
  mobileNavOpen: boolean
  setMobileNavOpen: (v: boolean) => void

  rightPanel: RightPanelKind
  rightPanelPayload: { contentId?: string; ideaId?: string; label?: string; platform?: PlatformId; topicId?: string }
  openPanel: (kind: Exclude<RightPanelKind, null>, payload?: AppState['rightPanelPayload']) => void
  closePanel: () => void

  /* --- overlays ------------------------------------------------------- */
  commandOpen: boolean
  searchOpen: boolean
  createOpen: boolean
  /** Which create submenu is expanded, e.g. 'content' | 'idea'. */
  createContext: string | null
  shortcutsOpen: boolean
  setCommandOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setCreateOpen: (v: boolean, context?: string | null) => void
  setShortcutsOpen: (v: boolean) => void

  /* --- density + preferences ------------------------------------------ */
  density: 'comfortable' | 'compact'
  setDensity: (d: 'comfortable' | 'compact') => void
  motion: 'full' | 'reduced'
  setMotion: (m: 'full' | 'reduced') => void
  contrast: 'normal' | 'high'
  setContrast: (c: 'normal' | 'high') => void
  showGrid: boolean
  toggleGrid: () => void

  /* --- transient content mutations (optimistic UI) -------------------- */
  updatedContent: Record<string, Partial<Content>>
  patchContent: (id: string, patch: Partial<Content>) => void
  customTypes: ContentTypeDef[]
  addCustomType: (t: ContentTypeDef) => void
  readNotifications: string[]
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (ids: string[]) => void

  /* --- toasts --------------------------------------------------------- */
  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  /* --- recents -------------------------------------------------------- */
  recents: { id: string; title: string; href: string; at: number }[]
  visit: (entry: { id: string; title: string; href: string }) => void

  /* --- integrations ---------------------------------------------------- */
  /** Which transport publishing uses. 'composio' only works once a key is set
      behind the proxy; 'local' is the deterministic stand-in. */
  transport: TransportId
  setTransport: (t: TransportId) => void
  /** Account state owned by the local transport, persisted across reloads. */
  localAccounts: ConnectedAccount[]
  setLocalAccounts: (accounts: ConnectedAccount[]) => void
  /** Composio user id the connected accounts are scoped to. */
  integrationUserId: string
  setIntegrationUserId: (id: string) => void
}

let toastSeq = 0

export const useApp = create<AppState>((set, get) => ({
  filters: { ...EMPTY_FILTERS },

  setPeriod: (period, from, to) => set((s) => ({ filters: { ...s.filters, period, customFrom: from, customTo: to } })),
  togglePlatform: (p) =>
    set((s) => {
      const has = s.filters.platforms.includes(p)
      const platforms = has ? s.filters.platforms.filter((x) => x !== p) : [...s.filters.platforms, p]
      return { filters: { ...s.filters, platforms } }
    }),
  setFilterList: (key, values) => set((s) => ({ filters: { ...s.filters, [key]: values } })),
  toggleFilterValue: (key, value) =>
    set((s) => {
      const list = s.filters[key]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      return { filters: { ...s.filters, [key]: next } }
    }),
  clearFilters: () => set((s) => ({ filters: { ...EMPTY_FILTERS, period: s.filters.period, customFrom: s.filters.customFrom, customTo: s.filters.customTo } })),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  mobileNavOpen: false,
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),

  rightPanel: null,
  rightPanelPayload: {},
  openPanel: (kind, payload = {}) => set({ rightPanel: kind, rightPanelPayload: payload }),
  closePanel: () => set({ rightPanel: null, rightPanelPayload: {} }),

  commandOpen: false,
  searchOpen: false,
  createOpen: false,
  createContext: null,
  shortcutsOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setCreateOpen: (v, context = null) => set({ createOpen: v, createContext: v ? context : null }),
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),

  density: 'compact',
  setDensity: (density) => set({ density }),
  motion: 'full',
  setMotion: (motion) => {
    document.documentElement.dataset.motion = motion === 'reduced' ? 'reduced' : 'full'
    set({ motion })
  },
  contrast: 'normal',
  setContrast: (contrast) => {
    document.documentElement.dataset.contrast = contrast === 'high' ? 'high' : 'normal'
    set({ contrast })
  },
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  updatedContent: {},
  patchContent: (id, patch) =>
    set((s) => ({ updatedContent: { ...s.updatedContent, [id]: { ...s.updatedContent[id], ...patch } } })),
  customTypes: [],
  addCustomType: (t) => set((s) => ({ customTypes: [...s.customTypes, t] })),
  readNotifications: [],
  markNotificationRead: (id) =>
    set((s) => ({ readNotifications: s.readNotifications.includes(id) ? s.readNotifications : [...s.readNotifications, id] })),
  markAllNotificationsRead: (ids) => set((s) => ({ readNotifications: [...new Set([...s.readNotifications, ...ids])] })),

  toasts: [],
  pushToast: (t) => {
    const id = `t-${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismissToast(id), 4600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  recents: [],
  visit: (entry) =>
    set((s) => {
      const filtered = s.recents.filter((r) => r.id !== entry.id)
      return { recents: [{ ...entry, at: Date.now() }, ...filtered].slice(0, 8) }
    }),

  transport: 'local',
  setTransport: (t) => set({ transport: t }),
  localAccounts: seedLocalState('creator-local').accounts,
  setLocalAccounts: (accounts) => set({ localAccounts: accounts }),
  integrationUserId: 'creator-local',
  setIntegrationUserId: (id) => set({ integrationUserId: id }),
}))

/* --- convenience selectors ------------------------------------------------- */
export const useFilters = () => useApp((s) => s.filters)
export const useFilterCount = () => {
  const f = useApp((s) => s.filters)
  return f.platforms.length + f.typeIds.length + f.topicIds.length + f.seriesIds.length + f.campaignIds.length + f.statuses.length
}
