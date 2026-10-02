import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Database, LayoutDashboard, Lightbulb, MoreHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'

/* ============================================================================
   MOBILE NAVIGATION
   Mobile is not a shrunken desktop: navigation moves to the bottom, tables
   become cards (see DataTable), and the create action becomes the focal point.
   ========================================================================== */

export function MobileNav() {
  const location = useLocation()
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const setCommandOpen = useApp((s) => s.setCommandOpen)

  const items = [
    { id: 'dash', label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { id: 'content', label: 'Content', href: '/content', icon: Database },
    { id: 'ideas', label: 'Ideas', href: '/ideas', icon: Lightbulb },
    { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ]

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[58px] items-stretch border-t border-line-2 bg-deep/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_38px_-26px_rgba(0,0,0,1)] backdrop-blur-xl lg:hidden"
    >
      {items.slice(0, 2).map((it) => (
        <MobileItem key={it.id} {...it} active={isActive(location.pathname, it.href)} />
      ))}

      <div className="flex flex-1 items-center justify-center">
        <button
          onClick={() => setCreateOpen(true, 'mobile')}
          aria-label="Quick create"
          className="press relative -mt-5 grid h-12 w-12 place-items-center rounded-full border border-accent-bright/50 bg-[linear-gradient(160deg,#8CBCFF,#5B9DFF_45%,#2F6FD0)] text-[#05101F] shadow-[0_10px_30px_-8px_rgba(91,157,255,0.95),0_1px_0_0_rgba(255,255,255,0.4)_inset] transition-transform duration-[var(--duration-2)] ease-[var(--ease-cockpit)] active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {items.slice(2).map((it) => (
        <MobileItem key={it.id} {...it} active={isActive(location.pathname, it.href)} />
      ))}

      <button
        onClick={() => setCommandOpen(true)}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-ink-low transition-colors duration-[var(--duration-2)] hover:text-ink active:text-ink"
        aria-label="More navigation and search"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" />
        <span className="text-[9.5px]">More</span>
      </button>
    </nav>
  )
}

function MobileItem({ label, href, icon: Icon, active }: { label: string; href: string; icon: typeof Database; active: boolean }) {
  return (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      className={cn('flex flex-1 flex-col items-center justify-center gap-1 transition-colors', active ? 'text-accent' : 'text-ink-low')}
    >
      <span className="relative">
        <Icon className="h-[18px] w-[18px]" />
        {active && (
          <>
            <span className="absolute -bottom-1.5 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-accent shadow-[0_0_6px_rgba(91,157,255,1)]" />
            <span className="absolute -top-2 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-accent/[0.12] blur-[10px]" aria-hidden />
          </>
        )}
      </span>
      <span className="text-[9.5px] font-medium">{label}</span>
    </Link>
  )
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}
