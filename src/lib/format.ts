/* ============================================================================
   FORMATTING
   One place for every number the product renders. Metrics are tabular and
   compact below 100k; exact values are reserved for tooltips and detail views.
   ========================================================================== */

export function fmtNumber(n: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (opts.compact) {
    if (abs >= 1_000_000_000) return trim(n / 1_000_000_000, opts.decimals ?? 1) + 'B'
    if (abs >= 1_000_000) return trim(n / 1_000_000, opts.decimals ?? 1) + 'M'
    if (abs >= 10_000) return trim(n / 1000, opts.decimals ?? 1) + 'k'
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: opts.decimals ?? 0,
    minimumFractionDigits: 0,
  }).format(n)
}

function trim(n: number, d: number) {
  const s = n.toFixed(d)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

export function fmtCurrency(n: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  const abs = Math.abs(n)
  if (opts.compact && abs >= 1000) return '$' + fmtNumber(n, { compact: true, decimals: opts.decimals ?? 1 })
  return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: opts.decimals ?? 0 }).format(n)
}

export function fmtPercent(n: number, decimals = 1): string {
  return `${n >= 0 ? '' : '−'}${Math.abs(n).toFixed(decimals)}%`
}

export function fmtSignedPercent(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(decimals)}%`
}

export function deltaPct(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

export function fmtDuration(minutes: number): string {
  if (minutes >= 60_000) return `${fmtNumber(minutes / 60_000, { decimals: 1 })}k hrs`
  if (minutes >= 1000) return `${fmtNumber(Math.round(minutes))} min`
  return `${fmtNumber(Math.round(minutes))} min`
}

export function fmtHours(minutes: number): string {
  const h = minutes / 60
  if (h >= 1000) return `${fmtNumber(h, { compact: true })} hrs`
  return `${trim(h, 1)} hrs`
}

export function fmtBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${trim(v, v < 10 ? 1 : 0)} ${units[i]}`
}

export function fmtMetricValue(metricId: string, value: number): string {
  switch (metricId) {
    case 'revenue':
      return fmtCurrency(value, { compact: value >= 10_000 })
    case 'engagementRate':
      return `${trim(value, 1)}%`
    case 'watchMinutes':
      return fmtDuration(value)
    case 'followers':
      return fmtNumber(value, { compact: true })
    default:
      return fmtNumber(value, { compact: value >= 100_000 })
  }
}

export function fmtMetricFull(metricId: string, value: number): string {
  switch (metricId) {
    case 'revenue':
      return fmtCurrency(value, { decimals: 0 })
    case 'engagementRate':
      return `${trim(value, 2)}%`
    case 'watchMinutes':
      return `${fmtNumber(Math.round(value))} minutes`
    case 'followers':
      return fmtNumber(value)
    default:
      return fmtNumber(value)
  }
}

/* --- dates ---------------------------------------------------------------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const parse = (iso: string) => new Date(iso + 'T00:00:00')

export function fmtDate(iso?: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!iso) return '—'
  const d = parse(iso)
  const m = MONTHS[d.getMonth()]
  if (style === 'short') return `${d.getDate()} ${m}`
  if (style === 'long') return `${DAYS[d.getDay()]}, ${d.getDate()} ${m} ${d.getFullYear()}`
  return `${d.getDate()} ${m}`
}

export function fmtDateFull(iso?: string): string {
  if (!iso) return '—'
  const d = parse(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtMonth(iso: string): string {
  const d = parse(iso)
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

export function fmtWeekday(iso: string): string {
  return DAYS[parse(iso).getDay()]
}

export function fmtRelative(isoTimestamp: string, now = new Date()): string {
  const then = new Date(isoTimestamp)
  const secs = Math.max(0, (now.getTime() - then.getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = secs / 60
  if (mins < 60) return `${Math.floor(mins)}m ago`
  const hrs = mins / 60
  if (hrs < 24) return `${Math.floor(hrs)}h ago`
  const days = hrs / 24
  if (days < 7) return `${Math.floor(days)}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function fmtRelativeFuture(iso?: string, now = new Date()): string {
  if (!iso) return '—'
  const target = new Date(iso + 'T00:00:00').getTime()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days = Math.round((target - today.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days < 7) return `in ${days}d`
  if (days < 30) return `in ${Math.round(days / 7)}w`
  return `in ${Math.round(days / 30)}mo`
}

export function relativeDays(iso?: string, now = new Date()): number | null {
  if (!iso) return null
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(iso + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
}

export function fmtClockTime(hour: number): string {
  const h = hour % 24
  const suffix = h < 12 ? 'am' : 'pm'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}${suffix}`
}

export function titleCase(s: string): string {
  return s.replace(/(^|\s|-)\w/g, (c) => c.toUpperCase()).replace(/-/g, ' ')
}
