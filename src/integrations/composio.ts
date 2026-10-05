import type {
  ConnectedAccount,
  IntegrationProvider,
  PublishPayload,
  PublishResult,
  ToolkitId,
} from './types'
import { IntegrationError } from './types'
import { LIVE_TOOLKIT_IDS, toolkitDef } from './registry'
import { blockingProblems } from './validate'

/* ============================================================================
   COMPOSIO ADAPTER

   Talks to Composio v3 over a same-origin proxy path. The proxy injects the
   project API key server-side; this file never sees, stores or forwards a
   credential, which is the only safe way to call Composio from a browser.

   Endpoints used (see docs.composio.dev):
     GET    /v3/connected_accounts?user_id=
     POST   /v3/connected_accounts/link
     DELETE /v3/connected_accounts/{id}
     POST   /v3/connected_accounts/{id}/refresh
     POST   /v3.1/tools/execute/{tool_slug}
     GET    /v3/tools/{tool_slug}
   ========================================================================== */

const PROXY = '/api/composio'

/** Non-secret configuration. A missing auth config id is reported, not guessed. */
function authConfigId(toolkit: ToolkitId): string | undefined {
  /* import.meta.env is injected by Vite. It is absent when the module runs
     outside a bundler (tests, tooling), so read it defensively. */
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>
  return env[`VITE_COMPOSIO_AUTH_CONFIG_${toolkit.toUpperCase()}`]
}

export function missingAuthConfigs(): ToolkitId[] {
  return LIVE_TOOLKIT_IDS.filter((t) => !authConfigId(t))
}

interface ProxyStatus {
  configured: boolean
  transport: 'composio'
  /** Toolkits whose auth config id is absent from the environment. */
  missingAuthConfigs: ToolkitId[]
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  let res: Response
  try {
    res = await fetch(`${PROXY}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new IntegrationError(
      'network',
      'Could not reach the Composio proxy',
      'The dev server proxy at /api/composio is not running. Restart the app after setting COMPOSIO_API_KEY.',
      true,
    )
  }

  if (res.status === 503) {
    const body = (await res.json().catch(() => null)) as { hint?: string } | null
    throw new IntegrationError(
      'not_configured',
      'Composio is not configured',
      body?.hint ?? 'Set COMPOSIO_API_KEY in the environment running the dev server, then restart.',
    )
  }
  if (res.status === 401 || res.status === 403) {
    throw new IntegrationError(
      'unauthorized',
      'Composio rejected the request',
      'The API key behind /api/composio is missing, revoked, or lacks permission for this endpoint.',
    )
  }
  if (res.status === 429) {
    throw new IntegrationError('rate_limited', 'Rate limited by Composio', 'Wait a moment and retry.', true)
  }
  if (res.status === 404) {
    throw new IntegrationError('tool_unavailable', `No Composio route at ${path}`, 'The tool slug or endpoint may have been renamed. Run Verify tools in Settings.')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new IntegrationError('provider', `Composio returned ${res.status}`, body?.message ?? 'The provider rejected the request. Check the execution log in Composio.', res.status >= 500)
  }
  return (await res.json()) as T
}

/* --- response shapes (structural, only the fields we read) ---------------- */

interface RawAccount {
  id: string
  status?: string
  toolkit?: { slug?: string; name?: string }
  created_at?: string
  updated_at?: string
  data?: Record<string, unknown>
  state?: { authScheme?: string }
}

function normalise(raw: RawAccount, fallbackToolkit: ToolkitId, userId: string): ConnectedAccount {
  const slug = (raw.toolkit?.slug ?? fallbackToolkit).toLowerCase() as ToolkitId
  const status = mapStatus(raw.status)
  return {
    id: raw.id,
    toolkit: slug,
    userId,
    status,
    accountName: str(raw.data?.accountName ?? raw.data?.name ?? raw.toolkit?.name),
    handle: str(raw.data?.handle ?? raw.data?.username),
    avatarSeed: (raw.id.length * 7) % 24,
    scopes: toolkitDef(slug).scopes,
    connectedAt: raw.created_at,
    lastSyncedAt: raw.updated_at,
    message: status === 'expired' ? 'Composio reports this connection as expired. Refresh to re-authorise.' : undefined,
  }
}

function mapStatus(raw?: string): ConnectedAccount['status'] {
  switch ((raw ?? '').toUpperCase()) {
    case 'ACTIVE':
    case 'INITIALIZED':
      return 'active'
    case 'INITIATING':
    case 'PENDING':
      return 'pending'
    case 'EXPIRED':
      return 'expired'
    case 'FAILED':
      return 'error'
    case 'INACTIVE':
      return 'disconnected'
    default:
      return 'disconnected'
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length ? v : undefined
}

/* --- arguments per toolkit ------------------------------------------------ */

function buildArguments(toolkit: ToolkitId, payload: PublishPayload) {
  const values = payload.values[toolkit] ?? {}
  const mediaType = payload.mediaType[toolkit]

  if (toolkit === 'youtube') {
    return {
      title: String(values.title ?? ''),
      description: String(values.description ?? ''),
      tags: Array.isArray(values.tags) ? values.tags : [],
      privacyStatus: String(values.visibility ?? 'private'),
      playlistId: values.playlist && values.playlist !== 'none' ? String(values.playlist) : undefined,
      madeForKids: Boolean(values.madeForKids),
      publishAt: payload.scheduledFor,
      thumbnailUrl: values.thumbnail ? String(values.thumbnail) : undefined,
      isShort: mediaType === 'short',
    }
  }

  if (toolkit === 'instagram') {
    const caption = [String(values.caption ?? ''), ...(Array.isArray(values.hashtags) ? values.hashtags : [])].join(' ').trim()
    return {
      caption,
      mediaType,
      mediaUrl: values.media ? String(values.media) : undefined,
      coverUrl: values.coverFrame && values.coverFrame !== 'auto' ? String(values.coverFrame) : undefined,
      altText: values.altText ? String(values.altText) : undefined,
      location: values.location ? String(values.location) : undefined,
      shareToFeed: Boolean(values.shareToFeed),
      publishAt: payload.scheduledFor,
    }
  }

  return {
    commentary: String(values.commentary ?? ''),
    visibility: String(values.visibility ?? 'PUBLIC'),
    mediaUrl: values.media ? String(values.media) : undefined,
    link: values.link ? String(values.link) : undefined,
    postAsOrganization: Boolean(values.postAsOrg),
  }
}

export class ComposioProvider implements IntegrationProvider {
  id = 'composio' as const
  label = 'Composio'
  configured = false

  constructor(private userId: string) {}

  /** Cheap probe that never leaves the proxy — tells the UI whether a key is set. */
  async probe(): Promise<ProxyStatus> {
    try {
      const res = await fetch(`${PROXY}/_status`)
      if (!res.ok) return { configured: false, transport: 'composio', missingAuthConfigs: missingAuthConfigs() }
      const body = (await res.json()) as Partial<ProxyStatus>
      this.configured = Boolean(body.configured)
      return {
        configured: this.configured,
        transport: 'composio',
        missingAuthConfigs: body.missingAuthConfigs ?? missingAuthConfigs(),
      }
    } catch {
      this.configured = false
      return { configured: false, transport: 'composio', missingAuthConfigs: missingAuthConfigs() }
    }
  }

  async listAccounts(userId = this.userId) {
    const res = await request<{ items?: RawAccount[] } | RawAccount[]>(`/v3/connected_accounts?user_id=${encodeURIComponent(userId)}`)
    const list = Array.isArray(res) ? res : (res.items ?? [])
    /* Composio only returns accounts that exist. Fill the gaps so the UI can
       offer a Connect action for each supported toolkit. */
    const seen = new Set<ToolkitId>()
    const accounts = list.map((raw) => {
      const acc = normalise(raw, 'youtube', userId)
      seen.add(acc.toolkit)
      return acc
    })
    for (const id of LIVE_TOOLKIT_IDS) {
      if (!seen.has(id)) {
        accounts.push({
          id: `unlinked:${id}`,
          toolkit: id,
          userId,
          status: 'disconnected',
          scopes: toolkitDef(id).scopes,
        })
      }
    }
    return accounts
  }

  async connect(toolkit: ToolkitId, userId = this.userId) {
    const authConfig = authConfigId(toolkit)
    if (!authConfig) {
      throw new IntegrationError(
        'not_configured',
        `No auth config for ${toolkit}`,
        `Set VITE_COMPOSIO_AUTH_CONFIG_${toolkit.toUpperCase()} to the auth config id from your Composio dashboard.`,
      )
    }
    const res = await request<{ id?: string; redirect_url?: string; redirectUrl?: string }>(`/v3/connected_accounts/link`, {
      method: 'POST',
      json: { auth_config_id: authConfig, user_id: userId },
    })
    return { accountId: res.id ?? `pending:${toolkit}`, redirectUrl: res.redirectUrl ?? res.redirect_url }
  }

  async disconnect(accountId: string) {
    if (accountId.startsWith('unlinked:')) return
    await request(`/v3/connected_accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' })
  }

  async refresh(accountId: string) {
    const res = await request<{ redirect_url?: string; redirectUrl?: string }>(
      `/v3/connected_accounts/${encodeURIComponent(accountId)}/refresh`,
      { method: 'POST', json: {} },
    )
    return { redirectUrl: res.redirectUrl ?? res.redirect_url }
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const attempts: PublishResult['attempts'] = []

    for (const target of payload.targets) {
      const started = Date.now()
      const def = toolkitDef(target.toolkit)

      const problems = blockingProblems(target.toolkit, payload.values[target.toolkit], payload.mediaType[target.toolkit])
      if (problems.length) {
        attempts.push({
          toolkit: target.toolkit,
          status: 'failed',
          durationMs: Date.now() - started,
          error: new IntegrationError('validation', `${problems[0].label}: ${problems[0].message}`, 'Fix the highlighted field and try again.'),
        })
        continue
      }

      if (!target.connectedAccountId || target.connectedAccountId.startsWith('unlinked:')) {
        attempts.push({
          toolkit: target.toolkit,
          status: 'failed',
          durationMs: Date.now() - started,
          error: new IntegrationError('not_connected', `${def.toolkitSlug} is not connected`, 'Connect the account from Settings → Connections first.'),
        })
        continue
      }

      const args = buildArguments(target.toolkit, payload)

      /* Instagram is a two-step publish: create a container, then publish it. */
      let lastError: IntegrationError | undefined
      let succeeded = false

      for (const slug of def.tools.publish) {
        try {
          const res = await request<{ data?: Record<string, unknown>; successful?: boolean }>(
            `/v3.1/tools/execute/${encodeURIComponent(slug)}`,
            {
              method: 'POST',
              json: {
                connected_account_id: target.connectedAccountId,
                user_id: this.userId,
                arguments: def.tools.prepare ? { ...args, creation_id: await this.createContainer(target, def.tools.prepare, args) } : args,
              },
            },
          )
          const data = (res.data ?? {}) as Record<string, unknown>
          attempts.push({
            toolkit: target.toolkit,
            status: 'succeeded',
            externalId: str(data.id ?? data.creation_id ?? data.video_id),
            url: str(data.url ?? data.permalink),
            toolSlug: slug,
            durationMs: Date.now() - started,
          })
          succeeded = true
          break
        } catch (err) {
          lastError = err instanceof IntegrationError ? err : new IntegrationError('provider', 'Publish failed', String(err))
          if (lastError.code !== 'tool_unavailable') break
        }
      }

      if (!succeeded && lastError) {
        attempts.push({ toolkit: target.toolkit, status: 'failed', durationMs: Date.now() - started, error: lastError })
      }
    }

    return { id: `pub_${Date.now()}`, at: new Date().toISOString(), attempts, transport: 'composio' }
  }

  private async createContainer(
    target: PublishPayload['targets'][number],
    slugs: string[],
    args: Record<string, unknown>,
  ): Promise<string | undefined> {
    let lastError: IntegrationError | undefined
    for (const slug of slugs) {
      try {
        const res = await request<{ data?: Record<string, unknown> }>(`/v3.1/tools/execute/${encodeURIComponent(slug)}`, {
          method: 'POST',
          json: { connected_account_id: target.connectedAccountId, user_id: this.userId, arguments: args },
        })
        return str((res.data ?? {}).id ?? (res.data ?? {}).creation_id)
      } catch (err) {
        lastError = err instanceof IntegrationError ? err : new IntegrationError('provider', 'Container creation failed', String(err))
        if (lastError.code !== 'tool_unavailable') throw lastError
      }
    }
    throw lastError ?? new IntegrationError('tool_unavailable', 'No container tool resolved', 'Run Verify tools in Settings.')
  }

  async verifyTools() {
    const out: { toolkit: ToolkitId; action: string; slug: string; ok: boolean; note?: string }[] = []
    for (const toolkit of LIVE_TOOLKIT_IDS) {
      const def = toolkitDef(toolkit)
      const groups: [string, string[] | undefined][] = [
        ['publish', def.tools.publish],
        ['prepare', def.tools.prepare],
        ['media', def.tools.media],
        ['metadata', def.tools.metadata],
      ]
      for (const [action, slugs] of groups) {
        for (const slug of slugs ?? []) {
          try {
            await request(`/v3/tools/${encodeURIComponent(slug)}`)
            out.push({ toolkit, action, slug, ok: true })
          } catch (err) {
            const e = err instanceof IntegrationError ? err : undefined
            out.push({ toolkit, action, slug, ok: false, note: e?.code === 'unauthorized' ? 'Check the API key.' : 'Not found in this project.' })
            if (e?.code === 'unauthorized' || e?.code === 'not_configured') return out
          }
        }
      }
    }
    return out
  }
}
