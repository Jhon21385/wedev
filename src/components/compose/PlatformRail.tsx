import { Check, Plug, PlugZap } from 'lucide-react'
import { Badge } from '@/components/ui/Surface'
import { cn } from '@/lib/cn'
import { LIVE_TOOLKIT_IDS, toolkitDef } from '@/integrations/registry'
import { STATUS_META } from '@/integrations/registry'
import { BrandMark } from './BrandMark'
import type { ConnectedAccount, ToolkitId } from '@/integrations/types'
import type { Integrations } from '@/integrations/useIntegrations'

/* ============================================================================
   PLATFORM RAIL
   Selection and connectivity in one row per platform: which post you are
   editing, whether it will actually go out, and — if not — the one thing
   standing in the way.
   ========================================================================== */

export const PLATFORM_COLORS: Record<ToolkitId, string> = {
  youtube: '#FF5D55',
  instagram: '#E079D8',
  linkedin: '#4D9BF5',
}

export function PlatformRail({
  integrations,
  selected,
  onSelect,
  enabled,
  onToggle,
  problemCount,
}: {
  integrations: Integrations
  selected: ToolkitId
  onSelect: (t: ToolkitId) => void
  enabled: Record<ToolkitId, boolean>
  onToggle: (t: ToolkitId, on: boolean) => void
  problemCount: Record<ToolkitId, number>
}) {
  return (
    <div className="space-y-1.5">
      {LIVE_TOOLKIT_IDS.map((id) => {
        const def = toolkitDef(id)
        const account = integrations.accountFor(id)
        const active = selected === id
        const live = account?.status === 'active'
        const busy = integrations.busy[`connect:${id}`] || integrations.busy[`refresh:${id}`]
        const problems = problemCount[id] ?? 0
        const canPublish = live && problems === 0

        return (
          <div
            key={id}
            className={cn(
              'rounded-lg border transition-colors duration-200',
              active ? 'border-accent/35 bg-accent/[0.06]' : 'border-line-2 bg-surface-1 hover:border-line-3',
            )}
          >
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => onToggle(id, !enabled[id])}
                aria-pressed={enabled[id]}
                aria-label={`${enabled[id] ? 'Exclude' : 'Include'} ${def.toolkitSlug}`}
                className={cn(
                  'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-all duration-200',
                  enabled[id] ? 'border-accent bg-accent/25' : 'border-line-3 hover:border-line-4',
                )}
              >
                {enabled[id] && <Check className="h-3 w-3 text-accent-bright" />}
              </button>

              <button type="button" onClick={() => onSelect(id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <BrandMark platform={id} className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ink-hi" style={{ color: active ? undefined : undefined }}>{def.toolkitSlug}</span>
                  <span className="mono block truncate text-[9.5px] text-ink-faint">
                    {live ? account?.handle ?? 'connected' : STATUS_META[account?.status ?? 'disconnected'].label}
                  </span>
                </span>
              </button>

              {live ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald shadow-[0_0_8px_-1px_rgba(52,211,153,0.9)]" title="Connected" />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => integrations.connect(id)}
                  className="shrink-0 rounded-md border border-line-3 px-1.5 py-0.5 text-[10px] text-ink-mid transition-colors hover:border-accent/40 hover:text-accent-ink disabled:opacity-50"
                >
                  {busy ? 'Linking…' : 'Connect'}
                </button>
              )}
            </div>

            {enabled[id] && !canPublish && (
              <p className="border-t border-line-1 px-2 py-1.5 text-[10.5px] leading-snug text-ink-faint">
                {!live ? 'Not connected — this platform will be skipped.' : problems === 1 ? '1 field needs attention.' : `${problems} fields need attention.`}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Compact connection summary for the composer header. */
export function ConnectionSummary({ integrations }: { integrations: Integrations }) {
  const { transport, connectedCount, proxyReady } = integrations
  const total = LIVE_TOOLKIT_IDS.length
  const live = connectedCount === total
  return (
    <div className="flex items-center gap-2">
      <Badge tone={live ? 'success' : 'warn'} size="sm">
        {live ? `${total}/${total} connected` : `${connectedCount}/${total} connected`}
      </Badge>
      <span className="flex items-center gap-1 text-[10.5px] text-ink-faint">
        {transport === 'composio' ? (
          proxyReady === false ? (
            <Plug className="h-3 w-3 text-amber" />
          ) : (
            <PlugZap className="h-3 w-3 text-emerald" />
          )
        ) : (
          <Plug className="h-3 w-3" />
        )}
        {transport === 'composio' ? (proxyReady === false ? 'Composio not configured' : 'Composio') : 'Local transport'}
      </span>
    </div>
  )
}

export function AccountBadge({ account }: { account?: ConnectedAccount }) {
  if (!account || account.status !== 'active') return null
  return (
    <span className="mono truncate text-[10px] text-ink-faint">
      {account.handle ?? account.accountName ?? account.id}
    </span>
  )
}
