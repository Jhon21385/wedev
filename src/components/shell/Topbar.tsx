import { Fragment, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, CircleHelp, Menu, Plus, Search, Sparkles, Upload, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { BREADCRUMB_MAP } from '@/app/nav'
import { Badge } from '@/components/ui/Surface'
import { IconButton } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Overlay'
import { fmtRelative } from '@/lib/format'
import { contentById } from '@/analytics/queries'

/* ============================================================================
   TOPBAR
   Persistent chrome: where am I, what just happened, and one keystroke into
   anything. Height is fixed at 52px to match the sidebar brand block exactly.
   ========================================================================== */

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const ds = useDataset()
  const setCommandOpen = useApp((s) => s.setCommandOpen)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const setShortcutsOpen = useApp((s) => s.setShortcutsOpen)
  const toggleSidebar = useApp((s) => s.toggleSidebar)
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed)
  const recents = useApp((s) => s.recents)

  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const out: { label: string; href: string }[] = []
    let href = ''
    for (const seg of segments) {
      href += `/${seg}`
      const known = BREADCRUMB_MAP[seg]
      if (known) {
        out.push({ label: known, href })
      } else {
        const item = contentById(ds, seg)
        out.push({ label: item?.title ?? (seg.length > 14 ? seg.slice(0, 12) + '…' : seg), href })
      }
    }
    return out
  }, [location.pathname, ds])

  return (
    <header className="relative z-20 flex h-[52px] shrink-0 items-center gap-3 border-b border-line-2 bg-deep/70 px-3 backdrop-blur-xl lg:px-4">
      <button
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-mid transition-colors hover:bg-white/[0.055] hover:text-ink-hi lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ---- breadcrumbs ------------------------------------------------ */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <Link to="/" className="shrink-0 rounded px-1 py-0.5 text-[12.5px] text-ink-low transition-colors hover:text-ink">
          Workspace
        </Link>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={c.href + i}>
              <ChevronRight className="h-3 w-3 shrink-0 text-ink-ghost" aria-hidden />
              {last ? (
                <span aria-current="page" className="max-w-[280px] truncate rounded px-1 py-0.5 text-[12.5px] font-medium text-ink-hi">
                  {c.label}
                </span>
              ) : (
                <Link to={c.href} className="max-w-[180px] truncate rounded px-1 py-0.5 text-[12.5px] text-ink-low transition-colors hover:text-ink">
                  {c.label}
                </Link>
              )}
            </Fragment>
          )
        })}
        {crumbs.length === 0 && (
          <>
            <ChevronRight className="h-3 w-3 text-ink-ghost" aria-hidden />
            <span aria-current="page" className="text-[12.5px] font-medium text-ink-hi">
              Dashboard
            </span>
          </>
        )}
      </nav>

      {/* ---- command trigger -------------------------------------------- */}
      <button
        onClick={() => setCommandOpen(true)}
        className={cn(
          'group ml-auto hidden h-8 w-[248px] shrink-0 items-center gap-2 rounded-lg border border-line-2 bg-white/[0.026] px-2.5 transition-all duration-200',
          'hover:border-line-3 hover:bg-white/[0.045] xl:flex',
        )}
      >
        <Search className="h-3.5 w-3.5 text-ink-faint transition-colors group-hover:text-ink-low" />
        <span className="flex-1 text-left text-[12px] text-ink-faint">Search or run a command</span>
        <span className="mono rounded border border-line-3 bg-white/[0.05] px-1.5 py-px text-[10px] text-ink-low">⌘K</span>
      </button>

      <div className="ml-auto flex items-center gap-1 xl:ml-0">
        <IconButton label="Search" icon={<Search />} onClick={() => setCommandOpen(true)} className="xl:hidden" />

        {/* ---- create --------------------------------------------------- */}
        <Popover
          align="end"
          width={268}
          trigger={({ toggle, open }) => (
            <button
              onClick={toggle}
              aria-expanded={open}
              className="ml-0.5 inline-flex h-7.5 items-center gap-1.5 rounded-lg border border-accent/28 bg-accent/[0.1] px-2.5 text-[12px] font-medium text-accent-ink transition-all duration-200 hover:border-accent/50 hover:bg-accent/[0.17]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create</span>
            </button>
          )}
        >
          {(close) => (
            <div className="p-1.5">
              <p className="cell-label px-2 pb-1.5 pt-1">Quick create</p>
              {[
                { id: 'content', label: 'New content', hint: 'C', icon: <Plus />, route: '/content?new=1' },
                { id: 'idea', label: 'New idea', hint: 'I', icon: <Sparkles />, route: '/ideas?new=1' },
                { id: 'script', label: 'New script', icon: <Zap />, route: '/content?new=1&preset=script' },
                { id: 'research', label: 'New research note', icon: <Search />, route: '/research?new=1' },
                { id: 'campaign', label: 'New campaign', icon: <Sparkles />, route: '/revenue?new=campaign' },
                { id: 'asset', label: 'Upload asset', icon: <Upload />, route: '/assets?upload=1' },
              ].map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    close()
                    setCreateOpen(true, a.id)
                    navigate(a.route)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-ink transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink-hi"
                >
                  <span className="text-ink-low [&>svg]:h-3.5 [&>svg]:w-3.5">{a.icon}</span>
                  <span className="flex-1">{a.label}</span>
                  {a.hint && <span className="mono text-[10px] text-ink-faint">{a.hint}</span>}
                </button>
              ))}
              <div className="my-1 h-px bg-line-2" />
              <button
                onClick={() => {
                  close()
                  navigate('/settings?tab=types')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-accent transition-colors duration-150 hover:bg-accent/[0.09]"
              >
                <Plus className="h-3.5 w-3.5" />
                Create custom content type
              </button>
            </div>
          )}
        </Popover>

        <IconButton label="Keyboard shortcuts" icon={<CircleHelp />} onClick={() => setShortcutsOpen(true)} side="bottom" />
        <NotificationBell />
      </div>

      {/* ---- recents strip --------------------------------------------- */}
      {recents.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent" aria-hidden />
      )}
    </header>
  )
}

/* -------------------------------------------------------------------------- */
function NotificationBell() {
  const ds = useDataset()
  const readIds = useApp((s) => s.readNotifications)
  const markRead = useApp((s) => s.markNotificationRead)
  const markAll = useApp((s) => s.markAllNotificationsRead)
  const navigate = useNavigate()

  const unread = ds.notifications.filter((n) => !n.read && !readIds.includes(n.id)).length
  const tone: Record<string, string> = {
    critical: '#FB7185',
    warn: '#FBBF24',
    positive: '#34D399',
    info: '#5B9DFF',
  }

  return (
    <Popover
      align="end"
      width={366}
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative grid h-7.5 w-7.5 place-items-center rounded-md text-ink-mid transition-colors hover:bg-white/[0.055] hover:text-ink-hi"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-3 min-w-3 place-items-center rounded-full bg-accent px-0.5 text-[8px] font-bold text-[#06101F] shadow-[0_0_8px_rgba(91,157,255,0.9)]">
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line-2 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-ink-hi">Signals</span>
              {unread > 0 && <Badge tone="accent" size="xs">{unread} new</Badge>}
            </div>
            <button
              onClick={() => markAll(ds.notifications.map((n) => n.id))}
              className="text-[11px] text-ink-low transition-colors hover:text-ink"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-[380px] overflow-y-auto">
            {ds.notifications.map((n) => {
              const isRead = n.read || readIds.includes(n.id)
              const item = contentById(ds, n.href?.split('/').pop())
              return (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markRead(n.id)
                      if (n.href) navigate(n.href)
                      close()
                    }}
                    className={cn(
                      'group flex w-full items-start gap-2.5 border-b border-line-1 px-3 py-2.5 text-left transition-colors duration-150 last:border-0 hover:bg-white/[0.035]',
                      isRead && 'opacity-55',
                    )}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: tone[n.severity], boxShadow: isRead ? undefined : `0 0 7px ${tone[n.severity]}` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium leading-snug text-ink-hi">{n.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-ink-low">{n.body}</span>
                      <span className="mono mt-1 flex items-center gap-2 text-[9.5px] text-ink-faint">
                        {fmtRelative(n.at)}
                        {item && <span className="truncate">· {item.code}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line-2 p-1.5">
            <button
              onClick={() => {
                navigate('/inbox')
                close()
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] text-ink-mid transition-colors hover:bg-white/[0.05] hover:text-ink-hi"
            >
              Open inbox →
            </button>
          </div>
        </div>
      )}
    </Popover>
  )
}
