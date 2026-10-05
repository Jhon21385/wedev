import type {
  ConnectedAccount,
  IntegrationProvider,
  PublishPayload,
  PublishResult,
  ToolkitId,
} from './types'
import { IntegrationError } from './types'
import { LIVE_TOOLKIT_IDS, toolkitDef } from './registry'
import { validateDraft } from './validate'

/* ============================================================================
   LOCAL TRANSPORT

   A deterministic stand-in that behaves like the real thing: connection
   states, asynchronous OAuth settling, latency, and the same error surface.
   It exists so the composer is fully exercisable before a key is configured —
   and so nothing in the UI has to know which transport is live.

   Seeded state mirrors the rest of the sample data: YouTube and Instagram are
   live, LinkedIn has drifted and needs re-auth (see the inbox signal).
   ========================================================================== */

const LATENCY = { connect: 420, publish: 900, verify: 260 }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Deterministic pseudo-id: stable across reloads, no crypto dependency. */
function pseudoId(prefix: string, seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `${prefix}_${(h >>> 0).toString(36)}`
}

export interface LocalState {
  accounts: ConnectedAccount[]
}

export function seedLocalState(userId: string): LocalState {
  const now = Date.now()
  return {
    accounts: [
      {
        id: pseudoId('ca', `youtube:${userId}`),
        toolkit: 'youtube',
        userId,
        status: 'active',
        accountName: 'Build with AI',
        handle: '@buildwithai',
        avatarSeed: 3,
        scopes: toolkitDef('youtube').scopes,
        connectedAt: new Date(now - 214 * 86_400_000).toISOString(),
        lastSyncedAt: new Date(now - 42 * 60_000).toISOString(),
      },
      {
        id: pseudoId('ca', `instagram:${userId}`),
        toolkit: 'instagram',
        userId,
        status: 'active',
        accountName: 'Build with AI',
        handle: '@buildwithai',
        avatarSeed: 11,
        scopes: toolkitDef('instagram').scopes,
        connectedAt: new Date(now - 168 * 86_400_000).toISOString(),
        lastSyncedAt: new Date(now - 96 * 60_000).toISOString(),
      },
      {
        id: pseudoId('ca', `linkedin:${userId}`),
        toolkit: 'linkedin',
        userId,
        status: 'expired',
        accountName: 'Aarav Menon',
        handle: 'in/aaravmenon',
        avatarSeed: 7,
        scopes: toolkitDef('linkedin').scopes,
        connectedAt: new Date(now - 351 * 86_400_000).toISOString(),
        lastSyncedAt: new Date(now - 6 * 86_400_000).toISOString(),
        message: 'Access token expired. Reconnect to restore publishing.',
      },
    ],
  }
}

export class LocalProvider implements IntegrationProvider {
  id = 'local' as const
  label = 'Local simulation'
  configured = true

  constructor(
    private state: LocalState,
    private onChange?: (next: LocalState) => void,
  ) {}

  private commit(next: LocalState) {
    this.state = next
    this.onChange?.(next)
  }

  async listAccounts(): Promise<ConnectedAccount[]> {
    /* Pending connections settle on their own, exactly as a real OAuth
       callback would — the UI polls for the transition. */
    let changed = false
    const accounts = this.state.accounts.map((a) => {
      if (a.status !== 'pending') return a
      changed = true
      return {
        ...a,
        status: 'active' as const,
        connectedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      }
    })
    if (changed) this.commit({ accounts })
    return accounts
  }

  async connect(toolkit: ToolkitId, userId: string) {
    const accountId = pseudoId('ca', `${toolkit}:${userId}`)
    const def = toolkitDef(toolkit)
    const existing = this.state.accounts.findIndex((a) => a.toolkit === toolkit)
    const account: ConnectedAccount = {
      id: accountId,
      toolkit,
      userId,
      status: 'pending',
      accountName: existing >= 0 ? this.state.accounts[existing].accountName : 'New connection',
      handle: existing >= 0 ? this.state.accounts[existing].handle : `@${toolkit}`,
      avatarSeed: existing >= 0 ? this.state.accounts[existing].avatarSeed : 5,
      scopes: def.scopes,
      message: 'Complete the authorisation window to finish linking.',
    }
    const accounts =
      existing >= 0 ? this.state.accounts.map((a, i) => (i === existing ? account : a)) : [...this.state.accounts, account]
    this.commit({ accounts })
    await sleep(LATENCY.connect)
    return { accountId, redirectUrl: undefined }
  }

  async disconnect(accountId: string) {
    this.commit({ accounts: this.state.accounts.filter((a) => a.id !== accountId) })
  }

  async refresh(accountId: string) {
    const accounts = this.state.accounts.map((a) =>
      a.id === accountId ? { ...a, status: 'pending' as const, message: 'Re-authorising…' } : a,
    )
    this.commit({ accounts })
    await sleep(LATENCY.connect)
    return { redirectUrl: undefined }
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const attempts: PublishResult['attempts'] = []

    for (const target of payload.targets) {
      const started = Date.now()
      const account = this.state.accounts.find((a) => a.toolkit === target.toolkit)
      const def = toolkitDef(target.toolkit)

      if (!account || account.status !== 'active') {
        attempts.push({
          toolkit: target.toolkit,
          status: 'failed',
          durationMs: Date.now() - started,
          error: new IntegrationError(
            'not_connected',
            `${def.toolkitSlug} is not connected`,
            'Connect the account from Settings → Connections, then publish again.',
          ),
        })
        continue
      }

      const problems = validateDraft(target.toolkit, payload.values[target.toolkit], payload.mediaType[target.toolkit])
      if (problems.length) {
        attempts.push({
          toolkit: target.toolkit,
          status: 'failed',
          durationMs: Date.now() - started,
          error: new IntegrationError('validation', `${problems[0].label}: ${problems[0].message}`, 'Fix the highlighted field and try again.'),
        })
        continue
      }

      await sleep(LATENCY.publish)
      const externalId = pseudoId(def.toolkitSlug.slice(0, 3), `${target.toolkit}:${payload.contentId ?? 'adhoc'}:${Date.now()}`)
      attempts.push({
        toolkit: target.toolkit,
        status: 'succeeded',
        externalId,
        url: externalUrlFor(target.toolkit, externalId),
        toolSlug: def.tools.publish[0],
        durationMs: Date.now() - started,
      })
    }

    return {
      id: pseudoId('pub', JSON.stringify(payload.targets) + Date.now()),
      at: new Date().toISOString(),
      attempts,
      transport: 'local',
    }
  }

  async verifyTools() {
    await sleep(LATENCY.verify)
    return LIVE_TOOLKIT_IDS.flatMap((toolkit) => {
      const def = toolkitDef(toolkit)
      const entries = [...(def.tools.prepare ?? []), ...def.tools.publish, ...(def.tools.media ?? []), ...(def.tools.metadata ?? [])]
      return entries.map((slug) => ({
        toolkit,
        action: slug,
        slug,
        ok: true,
        note: 'Local transport — slug not verified against a live registry.',
      }))
    })
  }
}

function externalUrlFor(toolkit: ToolkitId, id: string) {
  if (toolkit === 'youtube') return `https://youtu.be/${id}`
  if (toolkit === 'instagram') return `https://instagram.com/p/${id}`
  return `https://linkedin.com/feed/update/${id}`
}
