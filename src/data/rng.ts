/* Deterministic pseudo-randomness. The dataset must be identical on every load
   so charts, drill-downs and drill-throughs agree with each other. */

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rng {
  private r: () => number
  constructor(seed: number) {
    this.r = mulberry32(seed)
  }
  next() {
    return this.r()
  }
  float(min: number, max: number) {
    return min + this.r() * (max - min)
  }
  int(min: number, max: number) {
    return Math.floor(this.float(min, max + 1))
  }
  bool(p = 0.5) {
    return this.r() < p
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length)]
  }
  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr]
    const out: T[] = []
    for (let i = 0; i < n && copy.length; i++) {
      out.push(copy.splice(Math.floor(this.r() * copy.length), 1)[0])
    }
    return out
  }
  weighted<T>(entries: [T, number][]): T {
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let t = this.r() * total
    for (const [v, w] of entries) {
      t -= w
      if (t <= 0) return v
    }
    return entries[entries.length - 1][0]
  }
  /** Rough normal distribution via central limit. */
  gauss(mean: number, sd: number) {
    const u = (this.r() + this.r() + this.r() + this.r() + this.r() + this.r()) / 6
    return mean + (u - 0.5) * 3.464 * sd
  }
  /** Returns a value with a long tail — used for view counts, where a few
      pieces vastly outperform the median. */
  powerLaw(min: number, max: number, exponent = 2.2) {
    const u = this.r()
    const v = Math.pow(u, exponent)
    return Math.round(min + (max - min) * v)
  }
}

/* --- date helpers (local-time, ISO day keys) ------------------------------ */
export const DAY_MS = 86_400_000

export function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** `shift(base, -3)` → three days before base. */
export function shift(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / DAY_MS)
}

export function isoDaysAgo(base: Date, n: number) {
  return isoDay(shift(base, -n))
}

export function isoTimeAgo(base: Date, hours: number) {
  const d = new Date(base.getTime() - hours * 3600_000)
  return d.toISOString()
}
