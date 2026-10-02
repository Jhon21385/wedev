import { getDataset } from '@/data/store'
import {
  EMPTY_FILTERS,
  contentById,
  contentRows,
  pipelineStats,
  scopedTotals,
  type ContentRow,
  type FilterState,
} from '@/analytics/queries'
import { type PeriodPreset } from '@/analytics/periods'
import type { Content, Dataset, PlatformId } from '@/data/types'
import { platformById } from '@/data/registry'

/* ============================================================================
   API LAYER
   The single boundary between the interface and its data. Screens read through
   `api.*` and never reach into the seed themselves for anything that could
   plausibly be a network call: reads return provenance (live vs cached, latency,
   timestamp), writes are optimistic-first with explicit confirmation, and every
   failure is a typed `ApiError` carrying a human-readable hint and a retryable
   flag.

   Today the transport is the local dataset. Swapping it for HTTP means
   replacing `transport()` and nothing else — the shapes, the caching policy,
   the error taxonomy, the mutation contract and the loading states stay put.
   ========================================================================== */

export type ApiMode = 'live' | 'degraded' | 'offline'

export interface ApiResult<T> {
  data: T
  /** True when the live call failed and the last good snapshot was served. */
  cached: boolean
  latencyMs: number
  at: string
}

export interface ApiErrorShape {
  code: string
  status: number
  message: string
  hint: string
  retryable: boolean
}

export class ApiError extends Error implements ApiErrorShape {
  code: string
  status: number
  hint: string
  retryable: boolean

  constructor(shape: ApiErrorShape) {
    super(shape.message)
    this.name = 'ApiError'
    this.code = shape.code
    this.status = shape.status
    this.hint = shape.hint
    this.retryable = shape.retryable
  }

  /** The sentence a person reads in the interface. Never a stack trace. */
  get readable(): string {
    return `${this.message} ${this.hint}`.trim()
  }
}

export interface ApiState {
  mode: ApiMode
  /** In-flight request keys, so the UI can show exactly what is loading. */
  pending: string[]
  lastSyncAt: string | null
  /** Most recent failure, for the connection status surface. */
  lastError: ApiErrorShape | null
}

export interface SyncReport {
  platform: PlatformId
  ok: boolean
  rows: number
  latencyMs: number
  message: string
  syncedAt: string
}

/* ---------------------------------------------------------------------------
   Deterministic jitter
   The transport must behave the same way twice for the same request, or the
   test harnesses stop being meaningful. Duration and failure are both derived
   from a hash of the request key.
   ------------------------------------------------------------------------ */
function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const LATENCY_BASE = 90
const LATENCY_SPREAD = 180

function simulatedLatency(key: string): number {
  return LATENCY_BASE + (hash(key) % LATENCY_SPREAD)
}

/* ---------------------------------------------------------------------------
   The client
   ------------------------------------------------------------------------ */
type Listener = (state: ApiState) => void

class CreatorApi {
  mode: ApiMode = 'live'
  private cache = new Map<string, { data: unknown; at: number }>()
  private listeners = new Set<Listener>()
  private pending = new Set<string>()
  private state: ApiState = { mode: 'live', pending: [], lastSyncAt: null, lastError: null }
  /** When true, latency collapses to zero — used by data harnesses. */
  instant = false

  /* --- state plumbing --------------------------------------------------- */
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState = (): ApiState => this.state

  private emit(): void {
    this.state = { ...this.state, mode: this.mode, pending: [...this.pending] }
    for (const fn of this.listeners) fn(this.state)
  }

  private async wait(key: string): Promise<number> {
    const ms = this.instant ? 0 : simulatedLatency(key)
    if (ms) await new Promise((r) => setTimeout(r, ms))
    return ms
  }

  /** Force a transport mode. `offline` fails everything, `degraded` fails a
      deterministic slice — exactly what a flaky connection does. */
  setMode(mode: ApiMode): void {
    this.mode = mode
    this.emit()
  }

  /** Last known good value for a key, for offline fallbacks. */
  cached<T>(key: string): T | null {
    return (this.cache.get(key)?.data as T) ?? null
  }

  cacheAge(key: string): number | null {
    const hit = this.cache.get(key)
    return hit ? Date.now() - hit.at : null
  }

  /* --- core request ----------------------------------------------------- */
  private async request<T>(key: string, produce: () => T, opts: { fail?: boolean } = {}): Promise<ApiResult<T>> {
    this.pending.add(key)
    this.emit()
    try {
      const latencyMs = await this.wait(key)
      const shouldFail = opts.fail ?? (this.mode === 'offline' || (this.mode === 'degraded' && hash(key) % 4 === 0))
      if (shouldFail) {
        throw new ApiError(
          this.mode === 'offline'
            ? {
                code: 'network_unreachable',
                status: 0,
                message: 'No connection to the data service.',
                hint: 'Showing the last synced snapshot. Retry when you are back online.',
                retryable: true,
              }
            : {
                code: 'service_degraded',
                status: 503,
                message: 'The data service is responding slowly.',
                hint: 'Numbers below are from the last good sync.',
                retryable: true,
              },
        )
      }
      const data = produce()
      this.cache.set(key, { data, at: Date.now() })
      this.state = { ...this.state, lastError: null }
      return { data, cached: false, latencyMs, at: new Date().toISOString() }
    } catch (err) {
      const shape =
        err instanceof ApiError
          ? { code: err.code, status: err.status, message: err.message, hint: err.hint, retryable: err.retryable }
          : {
              code: 'unknown',
              status: 500,
              message: 'Something failed while reading your workspace.',
              hint: 'Retry — nothing was lost.',
              retryable: true,
            }
      this.state = { ...this.state, lastError: shape }
      const hit = this.cache.get(key)
      if (hit) {
        return { data: hit.data as T, cached: true, latencyMs: 0, at: new Date(hit.at).toISOString() }
      }
      throw err instanceof ApiError ? err : new ApiError(shape)
    } finally {
      this.pending.delete(key)
      this.emit()
    }
  }

  /* --- resources -------------------------------------------------------- */
  content = {
    /** Every piece in the library, already ranked the way the workspace reads it. */
    list: (scopeKey = 'all'): Promise<ApiResult<Content[]>> =>
      this.request(`content.list:${scopeKey}`, () => getDataset().content, { fail: false }),

    get: (id: string): Promise<ApiResult<Content>> =>
      this.request(`content.get:${id}`, () => {
        const item = contentById(getDataset(), id)
        if (!item) {
          throw new ApiError({
            code: 'not_found',
            status: 404,
            message: `No content object is stored under ${id}.`,
            hint: 'It may have been archived or merged into another piece.',
            retryable: false,
          })
        }
        return item
      }),

    /**
     * Writes are optimistic by contract: the caller has already applied the
     * change locally and rolls back if this rejects. The returned record is the
     * server's view, which is what the UI reconciles against.
     */
    update: async (id: string, patch: Partial<Content>): Promise<ApiResult<Content>> => {
      const result = await this.request(`content.update:${id}:${Object.keys(patch).sort().join(',')}`, () => {
        const base = contentById(getDataset(), id)
        if (!base) {
          throw new ApiError({
            code: 'not_found',
            status: 404,
            message: `Cannot update ${id} — it no longer exists.`,
            hint: 'Refresh the workspace to pull the current library.',
            retryable: false,
          })
        }
        return { ...base, ...patch, updatedAt: new Date().toISOString() }
      })
      return result
    },

    /** Analytics rows for one scope, computed the way the service would. */
    metrics: (scope: Partial<FilterState> = {}, opts: { includeUnpublished?: boolean } = {}): Promise<ApiResult<ContentRow[]>> => {
      const full = { ...EMPTY_FILTERS, ...scope }
      return this.request(`content.metrics:${scopeKey(full)}`, () => contentRows(getDataset(), full, opts))
    },
  }

  analytics = {
    /** Headline totals for a scope + period, as a single round trip. */
    totals: (preset: PeriodPreset, scope: Partial<FilterState> = {}): Promise<ApiResult<ReturnType<typeof scopedTotals>>> => {
      const full = { ...EMPTY_FILTERS, ...scope, period: preset }
      return this.request(`analytics.totals:${scopeKey(full)}`, () => scopedTotals(getDataset(), full))
    },

    /** Pipeline counts per stage. The stage list is the workspace's own. */
    pipeline: (stages: string[], scope: Partial<FilterState> = {}): Promise<ApiResult<ReturnType<typeof pipelineStats>>> => {
      const full = { ...EMPTY_FILTERS, ...scope }
      return this.request(`analytics.pipeline:${scopeKey(full)}`, () => pipelineStats(getDataset(), stages))
    },
  }

  integrations = {
    status: (): Promise<ApiResult<{ platform: PlatformId; ok: boolean; rows: number; syncedAt: string }[]>> =>
      this.request('integrations.status', () =>
        getDataset()
          .metrics.reduce<{ platform: PlatformId; ok: boolean; rows: number; syncedAt: string }[]>((acc, m) => {
            const found = acc.find((a) => a.platform === m.platform)
            if (found) {
              found.rows += 1
              if (m.date > found.syncedAt) found.syncedAt = m.date
            } else {
              acc.push({ platform: m.platform, ok: true, rows: 1, syncedAt: m.date })
            }
            return acc
          }, []),
      ),

    /** A single platform handshake — surfaced as a real request in Settings. */
    sync: async (platform: PlatformId): Promise<ApiResult<SyncReport>> => {
      const result = await this.request(`integrations.sync:${platform}`, () => {
        const ds = getDataset()
        const meta = platformById(platform)
        const rows = ds.metrics.filter((m) => m.platform === platform).length
        return {
          platform,
          ok: true,
          rows,
          latencyMs: simulatedLatency(platform),
          message:
            meta.status === 'live'
              ? `${meta.name} is streaming — ${rows.toLocaleString()} daily samples reconciled.`
              : `${meta.name} is architecturally supported but not connected yet.`,
          syncedAt: new Date().toISOString(),
        }
      })
      this.state = { ...this.state, lastSyncAt: result.data.syncedAt }
      this.emit()
      return result
    },

    syncAll: async (): Promise<{ reports: SyncReport[]; cached: boolean }> => {
      const ds = getDataset()
      const platforms = [...new Set(ds.metrics.map((m) => m.platform))]
      const reports = await Promise.all(platforms.map((p) => this.integrations.sync(p)))
      return { reports: reports.map((r) => r.data), cached: reports.some((r) => r.cached) }
    },
  }

  assets = {
    usage: (id: string): Promise<ApiResult<{ contentId: string; title: string }[]>> =>
      this.request(`assets.usage:${id}`, () =>
        getDataset()
          .content.filter((c) => c.assetIds.includes(id))
          .map((c) => ({ contentId: c.id, title: c.title })),
      ),
  }
}

export const api = new CreatorApi()

/* ---------------------------------------------------------------------------
   Scope plumbing
   Read methods take a scope key rather than the store's live filter object, so
   the transport stays free of UI concerns and the cache stays meaningful.
   ------------------------------------------------------------------------ */

/** Stable key for a scope, used for caching and for "what is loading". */
export function scopeKey(scope: Partial<FilterState>): string {
  const parts: string[] = [scope.period ?? '30d']
  for (const k of ['platforms', 'typeIds', 'topicIds', 'seriesIds', 'campaignIds', 'statuses'] as const) {
    const v = scope[k]
    if (v && v.length) parts.push(`${k}=${[...v].sort().join('|')}`)
  }
  return parts.join(',')
}

/* ---------------------------------------------------------------------------
   Error text
   One place decides how a failure is described to a person, so no screen has
   to invent its own wording.
   ------------------------------------------------------------------------ */
export function describeError(err: unknown): { title: string; body: string; retryable: boolean } {
  if (err instanceof ApiError) {
    return { title: err.message, body: err.hint, retryable: err.retryable }
  }
  return {
    title: 'We could not load this view',
    body: 'The request failed before it reached your data. Retry, or keep working from the cached snapshot.',
    retryable: true,
  }
}

/** Dataset helper kept here so the harnesses can assert on a stable surface. */
export function snapshot(): Dataset {
  return getDataset()
}

/** Human phrasing for "how stale is what I am looking at". */
export function describeFreshness(at: string | null): string {
  if (!at) return 'not synced yet'
  const then = new Date(at)
  const mins = Math.round((Date.now() - then.getTime()) / 60_000)
  if (mins < 1) return 'synced just now'
  if (mins < 60) return `synced ${mins}m ago`
  return `synced ${then.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}
