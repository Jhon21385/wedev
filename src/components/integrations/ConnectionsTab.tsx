import { AlertTriangle, CheckCircle2, KeyRound, Link2Off, Plug, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { Badge, KeyValue, Panel, PanelHeader } from '@/components/ui/Surface'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { Inset } from '@/components/ui/blocks'
import { BrandMark } from '@/components/compose/BrandMark'
import { PLATFORM_COLORS } from '@/components/compose/PlatformRail'
import { LIVE_TOOLKIT_IDS, STATUS_META, toolkitDef } from '@/integrations/registry'
import { useIntegrations } from '@/integrations/useIntegrations'
import { cn } from '@/lib/cn'
import { fmtRelative } from '@/lib/format'

/* ============================================================================
   CONNECTIONS
   Where a platform is actually linked. Composio owns the OAuth flow and holds
   the tokens; this screen only reads status. The project API key stays behind
   the proxy — it is never a client-side variable, which is why the env-var
   names shown here are server-side ones.
   ========================================================================== */

export function ConnectionsTab() {
  const i = useIntegrations()

  return (
    <div className="space-y-3.5">
      <Panel>
        <PanelHeader
          icon={<Plug />}
          title="Publishing transport"
          subtitle="The same composer drives either transport. Composio activates the moment a key exists behind the proxy."
          actions={
            <Segmented
              size="sm"
              value={i.transport}
              onChange={(v) => i.setTransport(v as 'local' | 'composio')}
              options={[
                { id: 'local', label: 'Local simulation' },
                { id: 'composio', label: 'Composio' },
              ]}
            />
          }
        />

        {i.transport === 'composio' && <ComposioStatus />}

        <div className="border-t border-line-1 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" />
            <p className="max-w-[92ch] text-[10.5px] leading-relaxed text-ink-low">
              Composio authenticates with a <span className="text-ink-mid">project-scoped</span> API key that covers every connected account. Browser code
              never holds it: calls go to the same-origin path <span className="mono text-ink-mid">/api/composio</span>, and the dev server attaches the
              key in Node. In production, serve that path from your own backend and the client needs no change.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3.5 lg:grid-cols-2">
        {LIVE_TOOLKIT_IDS.map((id) => (
          <ToolkitCard key={id} id={id} />
        ))}
      </div>

      <ToolVerification />
    </div>
  )
}

function ComposioStatus() {
  const i = useIntegrations()

  if (i.proxyReady === null) {
    return (
      <div className="border-t border-line-1 p-3.5">
        <p className="text-[11px] text-ink-faint">Checking the proxy…</p>
      </div>
    )
  }

  if (i.proxyReady === false) {
    return (
      <div className="border-t border-line-1 bg-amber/[0.04] p-3.5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-ink-hi">No API key behind the proxy</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
              Set <span className="mono text-ink-mid">COMPOSIO_API_KEY</span> in the environment running the dev server, then restart it. The proxy
              responds to <span className="mono text-ink-mid">GET /api/composio/_status</span> so you can confirm it without a request leaving your
              machine.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (i.missingConfigs.length) {
    return (
      <div className="border-t border-line-1 bg-amber/[0.04] p-3.5">
        <div className="flex items-start gap-2.5">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-ink-hi">Connected — auth config missing for {i.missingConfigs.join(', ')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-low">
              The key is set, but connecting a toolkit also needs its auth config id. Add{' '}
              {i.missingConfigs.map((t, n) => (
                <span key={t}>
                  {n > 0 && ', '}
                  <span className="mono text-ink-mid">VITE_COMPOSIO_AUTH_CONFIG_{t.toUpperCase()}</span>
                </span>
              ))}{' '}
              from your Composio dashboard. Auth config ids are not secrets.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-line-1 p-3.5">
      <p className="flex items-center gap-2 text-[11px] text-emerald">
        <CheckCircle2 className="h-3.5 w-3.5" /> Proxy configured with a live key and all three auth configs.
      </p>
    </div>
  )
}

function ToolkitCard({ id }: { id: (typeof LIVE_TOOLKIT_IDS)[number] }) {
  const i = useIntegrations()
  const def = toolkitDef(id)
  const account = i.accountFor(id)
  const status = account?.status ?? 'disconnected'
  const meta = STATUS_META[status]
  const busy = i.busy[`connect:${id}`] || i.busy[`refresh:${id}`] || i.busy[`disconnect:${id}`]
  const live = status === 'active'

  return (
    <Panel>
      <PanelHeader
        icon={<BrandMark platform={id} className="h-3.5 w-3.5" />}
        title={<span style={{ color: PLATFORM_COLORS[id] }}>{def.toolkitSlug}</span>}
        subtitle={`Publishes ${def.publishNoun}s · ${def.capabilities.media.length} format${def.capabilities.media.length === 1 ? '' : 's'}`}
        actions={
          <Badge tone={meta.tone as never} size="xs">
            {meta.label}
          </Badge>
        }
      />

      <div className="p-3.5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <KeyValue label="Account" value={account?.handle ?? account?.accountName ?? '—'} />
          <KeyValue label="Last synced" value={account?.lastSyncedAt ? fmtRelative(account.lastSyncedAt) : '—'} mono />
          <KeyValue label="Publish tools" value={def.tools.publish.length} mono hint="tried in order" />
          <KeyValue label="Prepare step" value={def.tools.prepare ? 'required' : 'single call'} />
        </dl>

        {account?.message && (
          <Inset className="mt-3 border-amber/20">
            <p className="text-[11px] leading-relaxed text-amber/90">{account.message}</p>
          </Inset>
        )}

        <div className="mt-3">
          <p className="cell-label mb-1.5">Scopes requested</p>
          <ul className="space-y-1">
            {def.scopes.map((s) => (
              <li key={s} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-line-4" />
                <span className="mono break-all text-[9.5px] leading-relaxed text-ink-faint">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line-2 p-3">
        {live ? (
          <>
            <Button size="xs" variant="ghost" icon={<RefreshCw className="h-3 w-3" />} onClick={() => i.reconnect(account!.id, id)} disabled={busy}>
              Re-authorise
            </Button>
            <Button size="xs" variant="outline" icon={<Link2Off className="h-3 w-3" />} onClick={() => i.disconnect(account!.id, id)} disabled={busy}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button size="xs" variant="primary" onClick={() => (status === 'expired' && account ? i.reconnect(account.id, id) : i.connect(id))} disabled={busy}>
            {busy ? 'Linking…' : status === 'expired' ? 'Reconnect' : 'Connect'}
          </Button>
        )}
        <span className="ml-auto self-center mono text-[9.5px] text-ink-ghost">{def.authScheme}</span>
      </div>
    </Panel>
  )
}

function ToolVerification() {
  const i = useIntegrations()

  return (
    <Panel>
      <PanelHeader
        icon={<ShieldCheck />}
        title="Tool verification"
        subtitle="Asks the live registry whether each configured slug still resolves — Composio renames tools, and a rename should be visible here rather than at publish time."
        actions={
          <Button size="xs" variant="secondary" onClick={() => i.verifyTools()} loading={i.verifying} disabled={i.verifying}>
            {i.verifying ? 'Checking…' : 'Verify tools'}
          </Button>
        }
      />

      {!i.verifications ? (
        <div className="p-3.5">
          <p className="text-[11px] leading-relaxed text-ink-low">
            {i.transport === 'composio'
              ? 'Run a check after changing toolkit versions. Every slug used by the composer is listed below.'
              : 'The local transport answers every slug optimistically — run this after switching to Composio for a real answer.'}
          </p>
          <ul className="mt-3 space-y-1">
            {LIVE_TOOLKIT_IDS.flatMap((t) => {
              const def = toolkitDef(t)
              return [...(def.tools.prepare ?? []), ...def.tools.publish, ...(def.tools.media ?? []), ...(def.tools.metadata ?? [])].map((slug) => (
                <li key={slug} className="flex items-center justify-between gap-3">
                  <span className="mono truncate text-[10px] text-ink-mid">{slug}</span>
                  <span className="shrink-0 text-[9.5px] uppercase tracking-[0.08em] text-ink-faint">{t}</span>
                </li>
              ))
            })}
          </ul>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-line-1)]">
          {i.verifications.map((v) => (
            <li key={`${v.toolkit}:${v.slug}`} className="flex items-center gap-2.5 px-3.5 py-2">
              {v.ok ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald" />
              ) : (
                <XCircle className="h-3 w-3 shrink-0 text-rose" />
              )}
              <span className={cn('mono min-w-0 flex-1 truncate text-[10.5px]', v.ok ? 'text-ink-mid' : 'text-ink')}>{v.slug}</span>
              <span className="shrink-0 text-[9.5px] uppercase tracking-[0.08em] text-ink-faint">{v.action}</span>
              {v.note && <span className="shrink-0 text-[10px] text-ink-low">{v.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
