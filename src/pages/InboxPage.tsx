import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Circle,
  Handshake,
  MessageSquare,
  Milestone,
  Settings2,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { fmtRelative } from '@/lib/format'
import type { Notification } from '@/data/types'
import { Badge, EmptyState, Panel, PanelHeader, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Segmented } from '@/components/ui/Field'

/* ============================================================================
   INBOX
   One place where the system talks back: deadlines, deal movement, trend
   anomalies, milestones. Read state is optimistic and reversible.
   ========================================================================== */

const KIND_META: Record<Notification['kind'], { label: string; color: string; icon: typeof Bell }> = {
  deadline: { label: 'Deadline', color: '#FBBF24', icon: AlertTriangle },
  deal: { label: 'Deal', color: '#5B9DFF', icon: Handshake },
  trend: { label: 'Trend', color: '#38D6F5', icon: TrendingUp },
  system: { label: 'System', color: '#6A7284', icon: Settings2 },
  comment: { label: 'Comment', color: '#A78BFA', icon: MessageSquare },
  milestone: { label: 'Milestone', color: '#34D399', icon: Milestone },
}

const SEVERITY_META: Record<Notification['severity'], { tone: 'neutral' | 'accent' | 'success' | 'warn' | 'danger' }> = {
  info: { tone: 'neutral' },
  warn: { tone: 'warn' },
  positive: { tone: 'success' },
  critical: { tone: 'danger' },
}

export function InboxPage() {
  const ds = useDataset()
  const settled = useSettled(160)
  const navigate = useNavigate()
  const readIds = useApp((s) => s.readNotifications)
  const markRead = useApp((s) => s.markNotificationRead)
  const markAllRead = useApp((s) => s.markAllNotificationsRead)
  const pushToast = useApp((s) => s.pushToast)
  const [filter, setFilter] = useState<'all' | 'unread' | Notification['kind']>('all')

  const notifications = useMemo(
    () =>
      ds.notifications
        .map((n) => ({ ...n, read: n.read || readIds.includes(n.id) }))
        .sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [ds.notifications, readIds],
  )

  const unread = notifications.filter((n) => !n.read)
  const critical = notifications.filter((n) => n.severity === 'critical' || n.severity === 'warn')

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    if (filter === 'unread') return unread
    return notifications.filter((n) => n.kind === filter)
  }, [notifications, filter, unread])

  const grouped = useMemo(() => {
    const buckets: { label: string; items: typeof filtered }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'This week', items: [] },
      { label: 'Earlier', items: [] },
    ]
    const now = Date.now()
    filtered.forEach((n) => {
      const hours = (now - +new Date(n.at)) / 3_600_000
      if (hours < 24) buckets[0].items.push(n)
      else if (hours < 48) buckets[1].items.push(n)
      else if (hours < 168) buckets[2].items.push(n)
      else buckets[3].items.push(n)
    })
    return buckets.filter((b) => b.items.length)
  }, [filtered])

  if (!settled) {
    return (
      <Page width="default">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-5 h-[480px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="default">
      <PageHeader
        eyebrow="Workspace"
        title="Inbox"
        description="Signals that need a decision. Everything here is generated from your own data — no drip campaigns, no product announcements."
        actions={
          <>
            <Button variant="secondary" size="md" icon={<CheckCheck />} onClick={() => {
              markAllRead(notifications.map((n) => n.id))
              pushToast({ kind: 'success', title: 'Inbox cleared', body: `${unread.length} notifications marked as read.` })
            }}>
              Mark all read
            </Button>
            <Button variant="primary" size="md" icon={<Sparkles />} onClick={() => pushToast({ kind: 'info', title: 'Digest scheduled', body: 'A morning summary will land at 08:00.' })}>
              Morning digest
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-3.5"
        items={[
          { label: 'Unread', value: String(unread.length), hint: `${notifications.length} total signals`, accent: unread.length ? '#5B9DFF' : undefined },
          { label: 'Needs attention', value: String(critical.filter((n) => !n.read).length), hint: 'warnings and critical items', accent: '#FB7185' },
          { label: 'Deadlines this week', value: String(notifications.filter((n) => n.kind === 'deadline').length), hint: 'content and deal milestones' },
          { label: 'Resolved', value: String(notifications.filter((n) => n.read).length), hint: 'read and archived' },
        ]}
      />

      <SplitGrid ratio="wide">
        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <Segmented
              size="sm"
              ariaLabel="Inbox filter"
              value={filter}
              onChange={(v: string) => setFilter(v as typeof filter)}
              options={[
                { id: 'all', label: 'All' },
                { id: 'unread', label: `Unread ${unread.length}` },
                ...Object.entries(KIND_META)
                  .filter(([kind]) => notifications.some((n) => n.kind === kind))
                  .slice(0, 4)
                  .map(([kind, meta]) => ({ id: kind, label: meta.label })),
              ]}
            />
          </div>

          {grouped.length ? (
            <div className="space-y-4">
              {grouped.map((group) => (
                <section key={group.label}>
                  <p className="cell-label mb-2">{group.label}</p>
                  <ul className="space-y-2">
                    {group.items.map((n) => {
                      const meta = KIND_META[n.kind]
                      const Icon = meta.icon
                      return (
                        <li key={n.id}>
                          <article
                            className={cn(
                              'group relative flex gap-3 rounded-xl border p-3.5 transition-all duration-200',
                              n.read ? 'border-line-2 bg-panel/60' : 'border-line-3 bg-panel',
                              !n.read && n.severity === 'critical' && 'border-l-2 border-l-rose/70',
                            )}
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${meta.color}3D`, background: `${meta.color}14` }}>
                              <Icon className="h-4 w-4" style={{ color: meta.color }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={cn('text-[12.5px]', n.read ? 'text-ink-mid' : 'font-medium text-ink-hi')}>{n.title}</p>
                                {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" aria-label="unread" />}
                                <Badge tone={SEVERITY_META[n.severity].tone} size="xs">
                                  {n.severity}
                                </Badge>
                                <Badge tone="outline" size="xs">
                                  {meta.label}
                                </Badge>
                              </div>
                              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-low">{n.body}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                                <span className="mono text-[10px] text-ink-faint">{fmtRelative(n.at)}</span>
                                {n.href && (
                                  <button onClick={() => navigate(n.href!)} className="inline-flex items-center gap-1 text-[11px] text-accent transition-colors hover:text-accent-ink">
                                    Open <ArrowUpRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <IconButton
                                label={n.read ? 'Mark unread' : 'Mark read'}
                                icon={n.read ? <Circle /> : <Check />}
                                size="xs"
                                onClick={() => {
                                  markRead(n.id)
                                  if (!n.read) pushToast({ kind: 'success', title: 'Marked as read', action: { label: 'Undo', run: () => markRead(n.id) } })
                                }}
                              />
                            </div>
                          </article>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={<BellOff />}
                title="Nothing needs you"
                body="No unread signals in this filter. Deadlines, deal movement and trend anomalies will appear here the moment they matter."
                actions={
                  <Button size="sm" variant="secondary" onClick={() => setFilter('all')}>
                    Show everything
                  </Button>
                }
              />
            </Panel>
          )}
        </div>

        <div className="space-y-3.5">
          <Panel>
            <PanelHeader dense icon={<Bell />} title="Signal mix" subtitle="What the system has been telling you" />
            <div className="space-y-2.5 p-3.5">
              {Object.entries(KIND_META).map(([kind, meta]) => {
                const count = notifications.filter((n) => n.kind === kind).length
                if (!count) return null
                return (
                  <div key={kind} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <span className="flex-1 text-[11.5px] text-ink-mid">{meta.label}</span>
                    <span className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                      <span className="block h-full rounded-full" style={{ width: `${(count / notifications.length) * 100}%`, background: meta.color }} />
                    </span>
                    <span className="mono w-5 text-right text-[10.5px] text-ink-faint">{count}</span>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<User />} title="Notification rules" subtitle="What is allowed to interrupt you" />
            <ul className="divide-y divide-[var(--color-line-1)]">
              {[
                { label: 'Deadlines within 72 hours', on: true },
                { label: 'Deal stage changes', on: true },
                { label: 'Overdue invoices', on: true },
                { label: 'Milestone crossings', on: true },
                { label: 'Trend anomalies over 25%', on: false },
                { label: 'Comment activity', on: false },
              ].map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className={cn('text-[11.5px]', r.on ? 'text-ink' : 'text-ink-faint')}>{r.label}</span>
                  <Badge tone={r.on ? 'success' : 'outline'} size="xs">
                    {r.on ? 'on' : 'off'}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </SplitGrid>
    </Page>
  )
}
