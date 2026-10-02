import { buildDataset } from './seed/dataset'
import type { Dataset } from './types'

/* ============================================================================
   DATA ACCESS
   A single, memoised dataset instance behind an accessor. Every selector,
   analytics function and component reads through here — which is exactly the
   seam a real API layer would occupy later.

   To move to a live backend: replace `getDataset()` with an async fetch and
   hydrate the same shape. Nothing downstream needs to change.
   ========================================================================== */

let cached: Dataset | null = null

export function getDataset(): Dataset {
  if (!cached) cached = buildDataset()
  return cached
}

/** Simulated latency for skeleton / loading states. Resolves immediately in
    reduced-motion or when the caller opts out. */
export function withLatency<T>(value: T, ms = 0): Promise<T> {
  if (ms <= 0) return Promise.resolve(value)
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const PLATFORM_IDS = ['youtube', 'instagram', 'linkedin'] as const
