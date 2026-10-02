import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ApiError, api, type ApiResult, type ApiState } from '@/data/api'

/* ============================================================================
   API HOOKS
   The bridge between the transport in `data/api.ts` and React. Every screen
   that reads remotely gets the same four things for free: a loading state, a
   served-from-cache flag, a typed error with a retry, and the timestamp of the
   data on screen. That uniformity is why the error and skeleton treatments can
   stay consistent across fifteen modules.
   ========================================================================== */

/** Live transport state: mode, in-flight request keys, last failure. */
export function useApiState(): ApiState {
  return useSyncExternalStore(api.subscribe, api.getState, api.getState)
}

export interface ApiQuery<T> {
  data: T | null
  /** True when the last good snapshot is on screen instead of fresh data. */
  cached: boolean
  loading: boolean
  error: ApiError | null
  /** ISO timestamp of the payload currently rendered. */
  at: string | null
  latencyMs: number | null
  retry: () => void
  /** Force a refetch without a loading flash — used by "Sync now". */
  refresh: () => void
}

/**
 * Runs an API read and keeps the last good value while a new one is in flight.
 * Failures degrade to the cache when one exists, so a flaky connection never
 * blanks a screen the operator is reading.
 */
export function useApiQuery<T>(
  label: string,
  run: () => Promise<ApiResult<T>>,
  deps: unknown[] = [],
  opts: { skip?: boolean } = {},
): ApiQuery<T> {
  const [data, setData] = useState<T | null>(() => api.cached<T>(label))
  const [cached, setCached] = useState(false)
  const [loading, setLoading] = useState(!opts.skip && !api.cached(label))
  const [error, setError] = useState<ApiError | null>(null)
  const [at, setAt] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)
  const mounted = useRef(true)
  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (opts.skip) return
    let cancelled = false
    setLoading(true)
    runRef
      .current()
      .then((res) => {
        if (cancelled || !mounted.current) return
        setData(res.data)
        setCached(res.cached)
        setError(null)
        setAt(res.at)
        setLatencyMs(res.latencyMs)
      })
      .catch((err: unknown) => {
        if (cancelled || !mounted.current) return
        setError(
          err instanceof ApiError
            ? err
            : new ApiError({
                code: 'unknown',
                status: 500,
                message: 'This view failed to load.',
                hint: 'Retry — the rest of the workspace is unaffected.',
                retryable: true,
              }),
        )
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, opts.skip, ...deps])

  const retry = useCallback(() => setNonce((n) => n + 1), [])
  return { data, cached, loading, error, at, latencyMs, retry, refresh: retry }
}
