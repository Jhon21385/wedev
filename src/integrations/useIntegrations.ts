import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { ComposioProvider } from './composio'
import { LocalProvider } from './local'
import { missingAuthConfigs } from './composio'
import { LIVE_TOOLKIT_IDS, toolkitDef } from './registry'
import { IntegrationError, type ConnectedAccount, type IntegrationProvider, type PublishPayload, type PublishResult, type ToolkitId } from './types'

/* ============================================================================
   INTEGRATION HOOK
   The single seam between React and the transports. Screens never import a
   provider directly, so swapping local for Composio is a store flag.
   ========================================================================== */

export interface ToolVerification {
  toolkit: ToolkitId
  action: string
  slug: string
  ok: boolean
  note?: string
}

const POLL_INTERVAL = 1500
const POLL_TIMEOUT = 120_000

export function useIntegrations() {
  const transport = useApp((s) => s.transport)
  const setTransport = useApp((s) => s.setTransport)
  const localAccounts = useApp((s) => s.localAccounts)
  const setLocalAccounts = useApp((s) => s.setLocalAccounts)
  const userId = useApp((s) => s.integrationUserId)
  const pushToast = useApp((s) => s.pushToast)
  const ds = useDataset()

  const [accounts, setAccounts] = useState<ConnectedAccount[]>(localAccounts)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<IntegrationError | null>(null)
  const [proxyReady, setProxyReady] = useState<boolean | null>(null)
  const [missingConfigs, setMissingConfigs] = useState<ToolkitId[]>([])
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [verifications, setVerifications] = useState<ToolVerification[] | null>(null)
  const [verifying, setVerifying] = useState(false)

  /* Keep the local transport pointed at the live store so a disconnect sticks. */
  const localRef = useRef<LocalProvider | null>(null)
  const provider: IntegrationProvider = useMemo(() => {
    if (transport === 'composio') return new ComposioProvider(userId)
    localRef.current = new LocalProvider({ accounts: localAccounts }, (next) => setLocalAccounts(next.accounts))
    return localRef.current
  }, [transport, userId, localAccounts, setLocalAccounts])

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      try {
        const list = await provider.listAccounts(userId)
        setAccounts(list)
        setLoadError(null)
        return list
      } catch (err) {
        const e = err instanceof IntegrationError ? err : new IntegrationError('network', 'Could not load connections', String(err), true)
        setLoadError(e)
        return []
      } finally {
        setLoading(false)
      }
    },
    [provider, userId],
  )

  /* Probe the proxy once per transport switch, then load accounts. */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (transport !== 'composio') {
        if (!cancelled) {
          setProxyReady(null)
          setMissingConfigs([])
        }
        await refresh()
        return
      }
      const p = new ComposioProvider(userId)
      const status = await p.probe()
      if (cancelled) return
      setProxyReady(status.configured)
      setMissingConfigs(status.missingAuthConfigs ?? missingAuthConfigs())
      await refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [transport, userId, refresh])

  const accountFor = useCallback((t: ToolkitId) => accounts.find((a) => a.toolkit === t), [accounts])
  const isLive = useCallback((t: ToolkitId) => accountFor(t)?.status === 'active', [accountFor])
  const connectedCount = accounts.filter((a) => a.status === 'active').length

  const withBusy = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
      setBusy((b) => ({ ...b, [key]: true }))
      try {
        return await fn()
      } finally {
        setBusy((b) => ({ ...b, [key]: false }))
      }
    },
    [],
  )

  /* Waits for a pending connection to flip to a terminal state. */
  const waitForResolution = useCallback(
    async (toolkit: ToolkitId) => {
      const deadline = Date.now() + POLL_TIMEOUT
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL))
        const list = await refresh({ silent: true })
        const acc = list.find((a) => a.toolkit === toolkit)
        if (acc && acc.status !== 'pending') return acc
      }
      return null
    },
    [refresh],
  )

  const connect = useCallback(
    async (toolkit: ToolkitId) => {
      return withBusy(`connect:${toolkit}`, async () => {
        try {
          const { redirectUrl } = await provider.connect(toolkit, userId)
          if (redirectUrl) {
            /* noopener,noreferrer: the pop-up never needs a handle on this
               window, and the poll below resolves the outcome. */
            window.open(redirectUrl, 'composio-oauth', 'width=620,height=760,noopener,noreferrer')
          }
          const resolved = await waitForResolution(toolkit)
          const def = toolkitDef(toolkit)
          if (resolved?.status === 'active') {
            pushToast({ kind: 'success', title: `${def.toolkitSlug} connected`, body: `${resolved.accountName ?? def.publishNoun} is ready to publish.` })
          } else if (resolved) {
            pushToast({ kind: 'warn', title: `${def.toolkitSlug} needs attention`, body: resolved.message ?? 'Connection did not complete.' })
          } else {
            pushToast({
              kind: 'warn',
              title: `${def.toolkitSlug} did not finish connecting`,
              body: 'Allow pop-ups for this site and try again, or open the authorisation link from Settings → Connections.',
            })
          }
          return resolved
        } catch (err) {
          const e = err instanceof IntegrationError ? err : new IntegrationError('network', 'Connect failed', String(err), true)
          pushToast({ kind: 'error', title: `Could not connect ${toolkitDef(toolkit).toolkitSlug}`, body: e.hint })
          return null
        }
      })
    },
    [provider, userId, waitForResolution, withBusy, pushToast],
  )

  const disconnect = useCallback(
    async (accountId: string, toolkit: ToolkitId) => {
      return withBusy(`disconnect:${toolkit}`, async () => {
        try {
          await provider.disconnect(accountId)
          await refresh({ silent: true })
          pushToast({ kind: 'info', title: `${toolkitDef(toolkit).toolkitSlug} disconnected` })
        } catch (err) {
          const e = err instanceof IntegrationError ? err : new IntegrationError('network', 'Disconnect failed', String(err), true)
          pushToast({ kind: 'error', title: 'Could not disconnect', body: e.hint })
        }
      })
    },
    [provider, refresh, withBusy, pushToast],
  )

  const reconnect = useCallback(
    async (accountId: string, toolkit: ToolkitId) => {
      return withBusy(`refresh:${toolkit}`, async () => {
        try {
          const { redirectUrl } = await provider.refresh(accountId)
          if (redirectUrl) window.open(redirectUrl, 'composio-oauth', 'width=620,height=760,noopener,noreferrer')
          await waitForResolution(toolkit)
          pushToast({ kind: 'success', title: `${toolkitDef(toolkit).toolkitSlug} reconnected` })
        } catch (err) {
          const e = err instanceof IntegrationError ? err : new IntegrationError('network', 'Reconnect failed', String(err), true)
          pushToast({ kind: 'error', title: 'Could not reconnect', body: e.hint })
        }
      })
    },
    [provider, waitForResolution, withBusy, pushToast],
  )

  const publish = useCallback(
    async (payload: PublishPayload): Promise<PublishResult | null> => {
      return withBusy('publish', async () => {
        try {
          const result = await provider.publish(payload)
          await refresh({ silent: true })
          return result
        } catch (err) {
          const e = err instanceof IntegrationError ? err : new IntegrationError('network', 'Publish failed', String(err), true)
          pushToast({ kind: 'error', title: 'Publish failed', body: e.hint })
          return null
        }
      })
    },
    [provider, refresh, withBusy, pushToast],
  )

  const verifyTools = useCallback(async () => {
    setVerifying(true)
    try {
      const out = await provider.verifyTools()
      setVerifications(out)
      return out
    } finally {
      setVerifying(false)
    }
  }, [provider])

  /** Every platform that can accept this publish right now. */
  const publishable = useMemo(
    () => LIVE_TOOLKIT_IDS.filter((t) => accountFor(t)?.status === 'active'),
    [accountFor],
  )

  return {
    transport,
    setTransport,
    provider,
    accounts,
    accountFor,
    isLive,
    publishable,
    connectedCount,
    loading,
    loadError,
    refresh,
    /** null = not using Composio, true = key present, false = key missing. */
    proxyReady,
    missingConfigs,
    busy,
    connect,
    disconnect,
    reconnect,
    publish,
    verifyTools,
    verifications,
    verifying,
    /** The creator id Composio scopes accounts to. */
    userId,
    creator: ds.creator,
  }
}

export type Integrations = ReturnType<typeof useIntegrations>
