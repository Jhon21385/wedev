import type { PlatformId } from '@/data/types'

/* ============================================================================
   INTEGRATION CONTRACT

   One interface, two transports. The composer, the settings screen and the
   content workspace all talk to this interface and nothing else, so swapping
   the local deterministic transport for a live Composio connection is a
   configuration change rather than a rewrite.

   The browser never sees a provider API key. Live calls go to a same-origin
   path that the dev server (or, in production, your own backend) proxies to
   Composio with the key injected server-side. See vite.config.ts.
   ========================================================================== */

export type ToolkitId = 'youtube' | 'instagram' | 'linkedin'

export type ConnectionStatus =
  /** No account linked yet. */
  | 'disconnected'
  /** OAuth flow started; waiting for the user to finish it in the provider. */
  | 'pending'
  /** Linked and usable. */
  | 'active'
  /** Linked but the token expired or was revoked; needs re-auth. */
  | 'expired'
  /** Transport is reachable but not configured (e.g. no API key behind the proxy). */
  | 'unconfigured'
  | 'error'

export interface ConnectedAccount {
  id: string
  toolkit: ToolkitId
  /** Stable user id Composio scopes accounts to. */
  userId: string
  status: ConnectionStatus
  /** Display name returned by the provider, e.g. a channel or page name. */
  accountName?: string
  /** Handle shown in dense UI, e.g. "@buildwithai". */
  handle?: string
  avatarSeed?: number
  scopes: string[]
  connectedAt?: string
  lastSyncedAt?: string
  /** Provider-side reason when status is 'expired' or 'error'. */
  message?: string
}

/* -------------------------------------------------------------------------- */
/* COMPOSITION                                                                */
/* -------------------------------------------------------------------------- */

export type FieldKind = 'text' | 'textarea' | 'tags' | 'select' | 'toggle' | 'media' | 'datetime'

export interface SelectOption {
  id: string
  label: string
  /** Shown under the option in the select sheet. */
  hint?: string
}

export interface ComposeField {
  id: string
  label: string
  kind: FieldKind
  /** Hard platform limit for text-ish fields; drives the counter. */
  limit?: number
  /** Soft guidance shown once the counter passes it. */
  recommended?: number
  required?: boolean
  hint?: string
  placeholder?: string
  options?: SelectOption[]
  /** Tags count as words against the limit for Instagram hashtags. */
  maxItems?: number
  /** Only include this field when the chosen media type is in this list. */
  showForMedia?: string[]
}

export interface PlatformCapability {
  /** Identifier used by the media-type selector, e.g. 'video' | 'image' | 'text'. */
  media: string[]
  supportsScheduling: boolean
  supportsThumbnail: boolean
  supportsFirstComment: boolean
  supportsCarousel: boolean
  supportsAltText: boolean
  /** Native scheduling requires the provider, not us. False means "publish now only". */
  scheduleNote?: string
}

export interface ToolkitDefinition {
  id: ToolkitId
  platform: PlatformId
  /** Composio toolkit slug and the OAuth scopes the actions need. */
  toolkitSlug: string
  authScheme: 'OAUTH2'
  scopes: string[]
  /** Human label for what gets published, e.g. "video". */
  publishNoun: string
  capabilities: PlatformCapability
  fields: ComposeField[]
  /**
   * Composio tool slugs, in preference order. The first slug that resolves
   * against the live tool registry wins, so a renamed tool degrades to a clear
   * warning in Settings rather than a silent failure at publish time.
   */
  tools: {
    publish: string[]
    /** Optional second step — Instagram creates a container, then publishes it. */
    prepare?: string[]
    media?: string[]
    metadata?: string[]
  }
  /** Where the composer should pull default copy from on a content object. */
  sourceHints?: { title?: string; body?: string; tags?: string }
}

/* -------------------------------------------------------------------------- */
/* PUBLISHING                                                                 */
/* -------------------------------------------------------------------------- */

export interface PublishTarget {
  toolkit: ToolkitId
  /** Composio connected account id used for the execution. */
  connectedAccountId?: string
}

export interface PublishPayload {
  /** The content object this post belongs to, for attribution back to analytics. */
  contentId?: string
  targets: PublishTarget[]
  /** Per-toolkit field values, keyed by field id. */
  values: Record<ToolkitId, Record<string, string | string[] | boolean>>
  mediaType: Record<ToolkitId, string>
  /** ISO timestamp, or undefined to publish immediately. */
  scheduledFor?: string
}

export interface PublishAttempt {
  toolkit: ToolkitId
  status: 'succeeded' | 'failed' | 'skipped'
  /** Provider-side identifier when it succeeded, e.g. a video or post id. */
  externalId?: string
  /** Resolved URL when the provider returns one. */
  url?: string
  /** Tool slug actually executed — proves which path ran. */
  toolSlug?: string
  error?: IntegrationError
  /** Milliseconds the attempt took. */
  durationMs: number
}

export interface PublishResult {
  id: string
  at: string
  attempts: PublishAttempt[]
  transport: TransportId
}

export type TransportId = 'composio' | 'local'

export class IntegrationError extends Error {
  code:
    | 'not_configured'
    | 'not_connected'
    | 'unauthorized'
    | 'rate_limited'
    | 'validation'
    | 'tool_unavailable'
    | 'network'
    | 'provider'
  /** True when retrying the same call could plausibly succeed. */
  retryable: boolean
  /** Shown to the user; never contains a raw secret. */
  hint: string

  constructor(code: IntegrationError['code'], message: string, hint: string, retryable = false) {
    super(message)
    this.name = 'IntegrationError'
    this.code = code
    this.hint = hint
    this.retryable = retryable
  }
}

/* -------------------------------------------------------------------------- */
/* PROVIDER                                                                   */
/* -------------------------------------------------------------------------- */

export interface IntegrationProvider {
  id: TransportId
  label: string
  /** True when the transport can actually reach a provider. */
  readonly configured: boolean

  /** Current state of every toolkit, in one call. */
  listAccounts(userId: string): Promise<ConnectedAccount[]>

  /**
   * Starts an OAuth link. Returns a URL to open; the connection resolves
   * asynchronously, so callers poll `listAccounts` until it leaves 'pending'.
   */
  connect(toolkit: ToolkitId, userId: string): Promise<{ redirectUrl?: string; accountId: string }>

  disconnect(accountId: string): Promise<void>

  /** Re-runs auth for an expired account. */
  refresh(accountId: string): Promise<{ redirectUrl?: string }>

  publish(payload: PublishPayload): Promise<PublishResult>

  /**
   * Asks the live registry whether each configured tool slug resolves. Used by
   * Settings to warn about drift before someone tries to publish.
   */
  verifyTools(): Promise<{ toolkit: ToolkitId; action: string; slug: string; ok: boolean; note?: string }[]>
}
