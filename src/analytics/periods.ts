import type { PlatformId } from '@/data/types'
import { getDataset } from '@/data/store'

/* ============================================================================
   PERIOD RESOLUTION
   Presets resolve to inclusive ISO day ranges, and always carry their own
   comparison windows so every KPI can answer "vs what?" without recomputation.
   ========================================================================== */

export type PeriodPreset = '7d' | '30d' | '90d' | 'ytd' | 'custom'

export interface Period {
  preset: PeriodPreset
  label: string
  from: string
  to: string
  /** Inclusive day count. */
  days: number
  prevFrom: string
  prevTo: string
  /** Same window one year earlier, clamped to the modelled history. */
  yearFrom: string
  yearTo: string
  yearAvailable: boolean
}

export const PERIOD_PRESETS: { id: PeriodPreset; label: string; title: string }[] = [
  { id: '7d', label: '7D', title: 'Last 7 days' },
  { id: '30d', label: '30D', title: 'Last 30 days' },
  { id: '90d', label: '90D', title: 'Last 90 days' },
  { id: 'ytd', label: 'YTD', title: 'Year to date' },
  { id: 'custom', label: 'Custom', title: 'Custom range' },
]

const shiftKey = (key: string, days: number) => {
  const d = new Date(key + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

const clamp = (key: string, min: string, max: string) => (key < min ? min : key > max ? max : key)

export function resolvePeriod(preset: PeriodPreset, customFrom?: string, customTo?: string): Period {
  const ds = getDataset()
  const first = ds.dayKeys[0]
  const today = ds.todayKey

  let from = today
  let to = today
  if (preset === '7d') from = shiftKey(today, -6)
  else if (preset === '30d') from = shiftKey(today, -29)
  else if (preset === '90d') from = shiftKey(today, -89)
  else if (preset === 'ytd') from = `${today.slice(0, 4)}-01-01`
  else {
    from = customFrom ?? shiftKey(today, -29)
    to = customTo ?? today
  }
  from = clamp(from, first, today)
  to = clamp(to, first, today)
  if (from > to) [from, to] = [to, from]

  const days = Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000) + 1
  const prevTo = shiftKey(from, -1)
  const prevFromRaw = shiftKey(prevTo, -(days - 1))
  const prevFrom = clamp(prevFromRaw, first, prevTo)

  const yearFromRaw = shiftKey(from, -365)
  const yearToRaw = shiftKey(to, -365)
  const yearAvailable = yearFromRaw >= first
  const yearFrom = clamp(yearFromRaw, first, today)
  const yearTo = clamp(yearToRaw, first, today)

  const labels: Record<PeriodPreset, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    ytd: 'Year to date',
    custom: 'Custom range',
  }

  return {
    preset,
    label: preset === 'custom' ? `${from} → ${to}` : labels[preset],
    from,
    to,
    days,
    prevFrom,
    prevTo,
    yearFrom,
    yearTo,
    yearAvailable,
  }
}

export function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to
}

/** Every ISO day inside a range (inclusive). */
export function daysInRange(from: string, to: string): string[] {
  const out: string[] = []
  let cur = from
  let guard = 0
  while (cur <= to && guard++ < 4000) {
    out.push(cur)
    cur = shiftKey(cur, 1)
  }
  return out
}

export const PLATFORM_FILTERS: { id: PlatformId; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
]
