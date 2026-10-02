import { Suspense, lazy, useEffect, useMemo, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/store/app'
import { useDataset, useHotkeys } from '@/lib/hooks'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { ContextPanel } from '@/components/shell/ContextPanel'
import { CommandPalette, ShortcutsSheet } from '@/components/shell/CommandPalette'
import { CreateFlow } from '@/components/shell/CreateFlow'
import { MobileNav } from '@/app/MobileNav'
import { ALL_NAV } from '@/app/nav'
import { ToastHost } from '@/components/ui/Overlay'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Skeleton, SkeletonText } from '@/components/ui/Surface'
import { Dashboard } from '@/pages/Dashboard'
import { ContentDatabase } from '@/pages/ContentDatabase'
import { ContentDetail } from '@/pages/ContentDetail'
import { CalendarPage } from '@/pages/CalendarPage'
import { IdeasPage } from '@/pages/IdeasPage'
import { ResearchPage } from '@/pages/ResearchPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AudiencePage } from '@/pages/AudiencePage'
import { RevenuePage } from '@/pages/RevenuePage'
import { AssetsPage } from '@/pages/AssetsPage'
import { BrandPage } from '@/pages/BrandPage'
import { InboxPage } from '@/pages/InboxPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WorkflowPage } from '@/pages/WorkflowPage'
import { NotFound } from '@/pages/NotFound'

/* Heavy analytical screens are code-split; the shell paints instantly. */
const AnalyticsLazy = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const AssetsLazy = lazy(() => import('@/pages/AssetsPage').then((m) => ({ default: m.AssetsPage })))

export function App() {
  const toasts = useApp((s) => s.toasts)
  const dismissToast = useApp((s) => s.dismissToast)
  const pushToast = useApp((s) => s.pushToast)
  const setCommandOpen = useApp((s) => s.setCommandOpen)
  const setSearchOpen = useApp((s) => s.setSearchOpen)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const setShortcutsOpen = useApp((s) => s.setShortcutsOpen)
  const toggleSidebar = useApp((s) => s.toggleSidebar)
  const setSidebarCollapsed = useApp((s) => s.setSidebarCollapsed)
  const closePanel = useApp((s) => s.closePanel)
  const mobileNavOpen = useApp((s) => s.mobileNavOpen)
  const setMobileNavOpen = useApp((s) => s.setMobileNavOpen)
  const rightPanel = useApp((s) => s.rightPanel)
  const openPanel = useApp((s) => s.openPanel)
  const motion = useApp((s) => s.motion)
  const setMotion = useApp((s) => s.setMotion)
  const density = useApp((s) => s.density)
  const ds = useDataset()
  const navigate = useNavigate()
  const location = useLocation()
  const visit = useApp((s) => s.visit)

  /* --- responsive shell: collapse the sidebar under 1280px --------------- */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)')
    const apply = () => setSidebarCollapsed(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [setSidebarCollapsed])

  /* --- respect the OS reduced-motion preference on first run ------------- */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setMotion('reduced')
  }, [setMotion])

  /* --- record recents for the palette ------------------------------------ */
  useEffect(() => {
    const id = location.pathname.split('/')[2]
    if (id) {
      const item = ds.content.find((c) => c.id === id)
      if (item) visit({ id: item.id, title: item.title, href: `/content/${item.id}` })
    }
  }, [location.pathname, ds, visit])

  /* --- route change: close the slide-over, return to the top -------------- */
  const scroller = useRef<HTMLElement | null>(null)
  useEffect(() => {
    setMobileNavOpen(false)
    const el = scroller.current
    if (!el) return
    const reduce = document.documentElement.dataset.motion === 'reduced'
    // `scrollTo` is missing in older embedded webviews and in the JSDOM harness.
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    else el.scrollTop = 0
  }, [location.pathname, setMobileNavOpen])

  /* --- global shortcuts -------------------------------------------------- */
  const hotkeys = useMemo(
    () => ({
      'mod+k': (e: KeyboardEvent) => {
        e.preventDefault()
        setCommandOpen(true)
      },
      'mod+p': (e: KeyboardEvent) => {
        e.preventDefault()
        setCommandOpen(true)
      },
      'mod+\\': (e: KeyboardEvent) => {
        e.preventDefault()
        toggleSidebar()
      },
      'mod+shift+m': (e: KeyboardEvent) => {
        e.preventDefault()
        const next = motion === 'reduced' ? 'full' : 'reduced'
        setMotion(next)
        pushToast({ kind: 'info', title: `Motion ${next === 'reduced' ? 'reduced' : 'restored'}`, body: 'Preference applies to every animation in Creator OS.' })
      },
      '/': (e: KeyboardEvent) => {
        e.preventDefault()
        setCommandOpen(true)
      },
      c: (e: KeyboardEvent) => {
        e.preventDefault()
        setCreateOpen(true, 'content')
      },
      i: (e: KeyboardEvent) => {
        e.preventDefault()
        navigate('/ideas?new=1')
      },
      a: () => navigate('/analytics'),
      d: () => navigate('/'),
      e: () => {
        if (rightPanel) closePanel()
        else openPanel('breakdown')
      },
      '?': (e: KeyboardEvent) => {
        e.preventDefault()
        setShortcutsOpen(true)
      },
      escape: () => {
        closePanel()
        setSearchOpen(false)
      },
    }),
    [setCommandOpen, toggleSidebar, motion, setMotion, pushToast, setCreateOpen, navigate, rightPanel, closePanel, openPanel, setShortcutsOpen, setSearchOpen],
  )

  useHotkeys(hotkeys)

  return (
    <div className="group/shell flex h-[100dvh] w-full overflow-hidden bg-base" data-density={density}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:border focus:border-accent/40 focus:bg-surface-2 focus:px-3 focus:py-2 focus:text-[12px] focus:text-ink-hi"
      >
        Skip to content
      </a>

      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main"
          ref={scroller}
          className="scroll-fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain"
          tabIndex={-1}
        >
          <ErrorBoundary label={titleForPath(location.pathname)} onRecover={() => navigate('/')}>
          <Suspense fallback={<PageSkeleton />}>
            {/* Keyed so each navigation plays the arrival transition. */}
            <div key={location.pathname} className="animate-[route-in_.34s_var(--ease-out-quint)_both]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/content" element={<ContentDatabase />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/analytics" element={<AnalyticsLazy />} />
              <Route path="/audience" element={<AudiencePage />} />
              <Route path="/revenue" element={<RevenuePage />} />
              <Route path="/assets" element={<AssetsLazy />} />
              <Route path="/brand" element={<BrandPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </div>
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* ---- slide-over navigation (phones + tablets) ------------------- */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 animate-[fade-in_.18s_var(--ease-cockpit)_both] bg-black/65 backdrop-blur-[3px]"
          />
          <div className="absolute inset-y-0 left-0 animate-[nav-in_.3s_var(--ease-out-quint)_both] shadow-[24px_0_60px_-30px_rgba(0,0,0,1)]">
            <Sidebar expanded />
          </div>
        </div>
      )}

      <ContextPanel />

      <CommandPalette />
      <ShortcutsSheet />
      <CreateFlow />
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
      <MobileNav />
    </div>
  )
}

/** Human-readable name for the current view, used by the error boundary. */
function titleForPath(pathname: string) {
  if (pathname === '/') return 'The dashboard'
  if (pathname.startsWith('/content/')) return 'This content workspace'
  const match = ALL_NAV.find((n) => n.href === pathname)
  return match ? match.label : 'This view'
}

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel p-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
            <SkeletonText lines={2} className="mt-3" />
          </div>
        ))}
      </div>
      <div className="panel p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-[220px] w-full" />
      </div>
    </div>
  )
}
