import { useMemo } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================================
   THUMBNAIL
   Procedural stand-in artwork. Deterministic per seed so the same content item
   always renders the same image — no network, no layout shift, and it reads as
   real thumbnail design rather than a grey placeholder box.
   ========================================================================== */

const PALETTES: [string, string, string][] = [
  ['#5B9DFF', '#1B2A45', '#0B1220'],
  ['#FF5A5A', '#3A1C22', '#150A0D'],
  ['#D976FF', '#2E1B3D', '#120A18'],
  ['#34D399', '#16342B', '#08170F'],
  ['#FBBF24', '#3A2C12', '#150F06'],
  ['#38D6F5', '#12303A', '#061319'],
  ['#A78BFA', '#251C42', '#0E0A1A'],
  ['#2DD4BF', '#123330', '#061614'],
]

export function Thumb({
  seed,
  title,
  className,
  aspect = '16/9',
  accent,
  compact,
}: {
  seed: number
  title?: string
  className?: string
  aspect?: string
  accent?: string
  compact?: boolean
}) {
  const { a, b, c, angle, blobX, blobY, rings } = useMemo(() => {
    const p = PALETTES[Math.abs(seed) % PALETTES.length]
    const rand = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
    return {
      a: accent ?? p[0],
      b: p[1],
      c: p[2],
      angle: Math.round(rand(1) * 360),
      blobX: 22 + rand(2) * 56,
      blobY: 18 + rand(3) * 54,
      rings: rand(4) > 0.45,
    }
  }, [seed, accent])

  return (
    <div
      className={cn('relative isolate overflow-hidden', className)}
      style={{ aspectRatio: aspect, background: `linear-gradient(${angle}deg, ${b}, ${c})` }}
      aria-hidden
    >
      <span
        className="absolute rounded-full blur-[26px]"
        style={{
          left: `${blobX}%`,
          top: `${blobY}%`,
          width: '62%',
          height: '78%',
          transform: 'translate(-50%, -50%)',
          background: a,
          opacity: 0.36,
        }}
      />
      {rings && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <circle cx={blobX} cy={blobY} r="30" fill="none" stroke={a} strokeOpacity={0.24} strokeWidth="0.4" />
          <circle cx={blobX} cy={blobY} r="44" fill="none" stroke={a} strokeOpacity={0.14} strokeWidth="0.4" />
        </svg>
      )}
      <span
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(9,9,11,0) 34%, rgba(9,9,11,0.86) 100%)' }}
      />
      {title && !compact && (
        <span className="absolute inset-x-0 bottom-0 p-2">
          <span className="line-clamp-2 text-[10.5px] font-semibold leading-[1.25] tracking-[-0.01em] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {title}
          </span>
        </span>
      )}
      <span className="absolute inset-0 ring-1 ring-inset ring-white/[0.07]" />
    </div>
  )
}

/** Square identity tile used by the brand system and asset folders. */
export function SwatchTile({ hex, label, role, className }: { hex: string; label: string; role?: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div
        className="relative h-[68px] w-full overflow-hidden rounded-lg border border-line-2"
        style={{ background: `linear-gradient(150deg, ${hex}, ${hex}99 60%, ${hex}55)` }}
      >
        <span className="absolute inset-0 ring-1 ring-inset ring-white/10" />
      </div>
      <p className="mt-2 truncate text-[11.5px] font-medium text-ink-hi">{label}</p>
      <p className="mono truncate text-[10px] text-ink-faint">{hex.toUpperCase()}</p>
      {role && <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-low">{role}</p>}
    </div>
  )
}
