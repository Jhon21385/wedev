import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Command,
  Copy,
  Link2,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { PRIMARY_NAV, UTILITY_NAV, WORKSPACE_NAV, type NavItem } from '@/app/nav'
import { Avatar, Badge, Ring } from '@/components/ui/Surface'
import { IconButton } from '@/components/ui/Button'
import { Menu, Modal, Popover } from '@/components/ui/Overlay'
import { Tooltip } from '@/components/ui/Tooltip'
import { getDataset } from '@/data/store'

/* ============================================================================
   SIDEBAR
   Two densities in one component: a 244px rail with labels + counts, and a
   56px icon rail. Collapse animates width only — never reflows the main grid.
   ========================================================================== */

export function Sidebar() {
  const ds = useDataset()
  const collapsed = useApp((s) => s.sidebarCollapsed)
  const toggle = useApp((s) => s.toggleSidebar)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const setCommandOpen = useApp((s) => s.setCommandOpen)
  const readNotifications = useApp((s) => s.readNotifications)

  const counts = useMemo(() => {
    const c = ds.content
    const byStatus = (ids: string[]) => c.filter((x) => ids.includes(x.status)).length
    return {
      inbox: ds.notifications.filter((n) => !n.read && !readNotifications.includes(n.id)).length,
      ideas: ds.ideas.filter((i) => i.status !== 'promoted' && i.status !== 'parked').length,
      drafts: byStatus(['idea', 'research', 'brief', 'scripting']),
      production: byStatus(['production', 'editing', 'review', 'ready']),
      published: byStatus(['published', 'scheduled']),
      archive: byStatus(['archived']),
    }
  }, [ds, readNotifications])

  return (
    <aside
      className={cn(
        'relative z-30 flex h-full shrink-0 flex-col border-r border-line-2 bg-deep/80 backdrop-blur-xl',
        'transition-[width] duration-300 ease-[var(--ease-cockpit)]',
        collapsed ? 'w-[56px]' : 'w-[236px]',
      )}
    >
      {/* ---- brand + workspace ------------------------------------------ */}
      <div className={cn('flex h-[52px] shrink-0 items-center gap-2 border-b border-line-2', collapsed ? 'justify-center px-2' : 'px-3')}>
        <Link to="/" className="group flex min-w-0 items-center gap-2.5" aria-label="Creator OS home">
          <Mark />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold leading-none tracking-[-0.01em] text-ink-hi">Creator OS</span>
              <span className="mono mt-1 block truncate text-[9.5px] leading-none text-ink-faint">{ds.creator.handle}</span>
            </span>
          )}
        </Link>
        {!collapsed && <WorkspaceSwitcher />}
      </div>

      {/* ---- quick actions ---------------------------------------------- */}
      {!collapsed && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-line-2 px-3 py-2">
          <button
            onClick={() => setCreateOpen(true, 'root')}
            className="group flex h-7.5 flex-1 items-center gap-2 rounded-lg border border-accent/25 bg-accent/[0.09] px-2.5 text-[12px] font-medium text-accent-ink transition-all duration-200 hover:border-accent/45 hover:bg-accent/[0.15]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Create</span>
            <span className="mono text-[10px] text-accent/60">C</span>
          </button>
          <IconButton
            label="Search"
            icon={<Search />}
            shortcut="⌘K"
            onClick={() => setCommandOpen(true)}
            className="border border-line-2"
          />
        </div>
      )}

      {/* ---- navigation -------------------------------------------------- */}
      <nav className="scroll-fade-y min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
        <Group label="Main" collapsed={collapsed}>
          {PRIMARY_NAV.map((item) => (
            <NavRow key={item.id} item={item} collapsed={collapsed} />
          ))}
        </Group>

        <Group label="Workspace" collapsed={collapsed} className="mt-4">
          {WORKSPACE_NAV.map((item) => (
            <NavRow key={item.id} item={item} collapsed={collapsed} count={item.countKey ? counts[item.countKey] : undefined} />
          ))}
        </Group>

        <Group label="Workflow" collapsed={collapsed} className="mt-4">
          {UTILITY_NAV.map((item) => (
            <NavRow key={item.id} item={item} collapsed={collapsed} />
          ))}
        </Group>

        {!collapsed && <StorageMeter />}
      </nav>

      {/* ---- footer ------------------------------------------------------ */}
      <ProfileFooter collapsed={collapsed} />

      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-[58px] z-40 hidden h-6 w-6 place-items-center rounded-full border border-line-3 bg-surface-2 text-ink-low shadow-[0_4px_14px_-4px_rgba(0,0,0,0.9)] transition-all duration-200 hover:border-accent/40 hover:text-accent group-hover/shell:grid lg:grid"
      >
        {collapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */
function Mark() {
  return (
    <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-accent/30 bg-gradient-to-br from-accent/25 to-accent/[0.04]">
      <span className="absolute inset-0 rounded-[9px] bg-accent/12 blur-[6px]" aria-hidden />
      <svg viewBox="0 0 24 24" className="relative h-4 w-4" aria-hidden>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="rgba(140,188,255,0.4)" strokeWidth="1.1" />
        <circle cx="12" cy="12" r="3.4" fill="none" stroke="#8CBCFF" strokeWidth="1.4" />
        <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="#8CBCFF" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function Group({ label, children, collapsed, className }: { label: string; children: React.ReactNode; collapsed: boolean; className?: string }) {
  return (
    <div className={className}>
      {!collapsed && <p className="cell-label px-2 pb-1.5">{label}</p>}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

function NavRow({ item, collapsed, count }: { item: NavItem; collapsed: boolean; count?: number }) {
  const location = useLocation()
  const [path, query] = item.href.split('?')
  const isActive = query
    ? location.pathname === path && new URLSearchParams(location.search).toString() === new URLSearchParams(query).toString()
    : location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/')) || (path === '/' && location.pathname === '/')

  const Icon = item.icon

  const row = (
    <Link
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/row relative flex items-center gap-2.5 rounded-lg transition-all duration-200 ease-[var(--ease-cockpit)]',
        collapsed ? 'mx-auto h-8 w-8 justify-center' : 'h-[30px] px-2',
        isActive
          ? 'bg-white/[0.062] text-ink-hi'
          : 'text-ink-mid hover:bg-white/[0.038] hover:text-ink-hi',
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(91,157,255,0.85)]" aria-hidden />
      )}
      {isActive && collapsed && (
        <span className="absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(91,157,255,0.85)]" aria-hidden />
      )}
      <Icon className={cn('shrink-0 transition-colors', collapsed ? 'h-[17px] w-[17px]' : 'h-[15px] w-[15px]', isActive ? 'text-accent-bright' : 'text-ink-low group-hover/row:text-ink')} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-[12.5px]">{item.label}</span>
          {item.shortcut && <span className="mono text-[9.5px] text-ink-ghost opacity-0 transition-opacity group-hover/row:opacity-100">{item.shortcut}</span>}
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                'mono rounded-[5px] px-1.5 py-px text-[9.5px] leading-[14px]',
                item.badge === 'glow' ? 'bg-accent/16 text-accent-ink shadow-[0_0_10px_-3px_rgba(91,157,255,0.8)]' : 'text-ink-faint',
              )}
            >
              {count}
            </span>
          )}
        </>
      )}
      {collapsed && count !== undefined && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(91,157,255,0.9)]" />
      )}
    </Link>
  )

  if (!collapsed) return <li>{row}</li>
  return (
    <li>
      <Tooltip content={item.label} shortcut={item.shortcut} side="right" delay={140}>
        {row}
      </Tooltip>
    </li>
  )
}

function WorkspaceSwitcher() {
  const ds = useDataset()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(ds.creator.workspaces[0].id)
  const current = ds.creator.workspaces.find((w) => w.id === active) ?? ds.creator.workspaces[0]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Switch workspace"
        className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-low transition-colors hover:bg-white/[0.06] hover:text-ink"
      >
        <ChevronsRight className="h-3.5 w-3.5 rotate-90" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Switch workspace" description="Each workspace keeps its own content graph, analytics scope and brand system." size="sm">
        <ul className="space-y-1">
          {ds.creator.workspaces.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => {
                  setActive(w.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200',
                  w.id === current.id ? 'border-accent/30 bg-accent/[0.08]' : 'border-line-2 hover:bg-white/[0.04]',
                )}
              >
                <span className="h-6 w-6 shrink-0 rounded-md" style={{ background: `${w.color}33`, border: `1px solid ${w.color}66` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-ink-hi">{w.name}</span>
                  <span className="block text-[10.5px] text-ink-low">{w.role}</span>
                </span>
                {w.id === current.id && <Badge tone="accent" size="xs">Active</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

function StorageMeter() {
  const ds = useDataset()
  const totalBytes = ds.assets.reduce((s, a) => s + a.size, 0)
  const pct = 82
  return (
    <div className="mt-5 rounded-lg border border-line-1 bg-white/[0.018] px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="cell-label">Storage</span>
        <span className="mono text-[9.5px] text-amber">82%</span>
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-amber/60 to-amber" style={{ width: `${pct}%` }} />
      </div>
      <p className="mono mt-1.5 text-[9.5px] leading-tight text-ink-faint">
        {(totalBytes / 1e12).toFixed(1)} TB · {(totalBytes * 6.2 / 1e12).toFixed(1)} TB of 18 TB
      </p>
    </div>
  )
}

function ProfileFooter({ collapsed }: { collapsed: boolean }) {
  const ds = useDataset()
  const pushToast = useApp((s) => s.pushToast)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-2 border-t border-line-2 py-3">
        <Avatar name={ds.creator.name} seed={ds.creator.avatarSeed} size={26} ring />
        <span className="relative flex h-2 w-2" title="All platforms connected">
          <span className="absolute inset-0 animate-[blip_2.4s_ease-in-out_infinite] rounded-full bg-emerald" />
          <Circle className="relative h-2 w-2 fill-emerald text-emerald" />
        </span>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t border-line-2 p-2.5">
      <Popover
        align="start"
        side="top"
        width={244}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-200 hover:bg-white/[0.05]"
          >
            <span className="relative">
              <Avatar name={ds.creator.name} seed={ds.creator.avatarSeed} size={28} ring />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-deep bg-emerald" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-hi">{ds.creator.name}</span>
              <span className="mono block truncate text-[9.5px] text-ink-faint">{ds.creator.timezone}</span>
            </span>
            <Ring value={92} size={20} thickness={2} color="#34D399">
              <span className="mono text-[7px] font-semibold text-emerald">92</span>
            </Ring>
          </button>
        )}
      >
        <Menu
          items={[
            { id: 'profile', label: 'Profile & creator identity', icon: <Circle />, onSelect: () => navigate('/settings') },
            { id: 'workspace', label: 'Workspace settings', icon: <Settings />, onSelect: () => navigate('/settings') },
            { id: 'connections', label: 'Platform connections', icon: <Link2 />, hint: '3 live' },
            { id: 'security', label: 'Permissions & security', icon: <Shield />, separatorBefore: true },
            { id: 'switch', label: 'Switch workspace', icon: <Copy />, onSelect: () => navigate('/settings') },
            {
              id: 'signout',
              label: 'Sign out',
              icon: <LogOut />,
              danger: true,
              separatorBefore: true,
              onSelect: () => pushToast({ kind: 'info', title: 'Sign-out is disabled in the demo workspace' }),
            },
          ]}
        />
        <div className="border-t border-line-2 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="cell-label">Connections</span>
            <span className="mono text-[9.5px] text-emerald">3 / 3 live</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {getDataset()
              .platforms.filter((p) => p.status === 'live')
              .map((p) => (
                <span
                  key={p.id}
                  title={`${p.name} — connected`}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: `${p.color}80`, boxShadow: `0 0 6px -1px ${p.color}` }}
                />
              ))}
          </div>
        </div>
      </Popover>

      <div className="mt-1.5 flex items-center gap-1 px-1">
        <Sparkles className="h-3 w-3 text-accent/60" />
        <span className="mono truncate text-[9.5px] text-ink-faint">synced 2 min ago · v1.0.0</span>
        <Command className="ml-auto h-3 w-3 text-ink-ghost" />
      </div>
    </div>
  )
}
