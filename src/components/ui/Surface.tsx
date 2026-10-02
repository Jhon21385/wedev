import type { ReactNode } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Minus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmtSignedPercent } from '@/lib/format'

/* ============================================================================
   SURFACES + FEEDBACK
   Panels are meaningful containers only — never decoration. The `glow` prop is
   the single sanctioned use of the JARVIS ambient accent.
   ========================================================================== */

export function Panel({
  children,
  className,
  glow,
  interactive,
  lift,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  /** 0 = none, 1 = subtle hover bloom, 2 = selected, 3 = focused */
  glow?: 0 | 1 | 2 | 3
  interactive?: boolean
  /** Rises 1.5px on hover — for cards that open something. */
  lift?: boolean
  as?: 'section' | 'div' | 'article' | 'aside'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        'relative rounded-xl border border-line-2 bg-panel',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.022),0_1px_2px_0_rgba(0,0,0,0.3)]',
        'transition-[border-color,background-color,box-shadow,transform] duration-250 ease-[var(--ease-cockpit)]',
        (lift || interactive) && 'lift',
        glow === 2 && 'glow-2',
        glow === 3 && 'glow-3',
        interactive && 'hover:border-line-3 hover:bg-surface-1',
        glow === 1 && 'hover:shadow-[0_0_26px_-10px_rgba(91,157,255,0.4)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
  dense,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
  dense?: boolean
}) {
  return (
    <header
      className={cn(
        'relative flex items-start justify-between gap-4 border-b border-line-1',
        dense ? 'px-3 py-2' : 'px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-px shrink-0 text-ink-low [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-[12.5px] font-semibold tracking-[-0.012em] text-ink-hi">{title}</h3>
          {subtitle && <p className="mt-0.5 max-w-[92ch] text-[11.5px] leading-snug text-ink-low">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  )
}

/** Section label used above dense groups — the editorial "eyebrow". */
export function SectionHeader({
  label,
  title,
  hint,
  actions,
  className,
}: {
  label?: string
  title?: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {label && (
          <div className="mb-1 flex items-center gap-2">
            <span className="h-px w-3 bg-accent/60" />
            <span className="cell-label text-accent/90">{label}</span>
          </div>
        )}
        {title && <h2 className="title-3">{title}</h2>}
        {hint && <p className="mt-1 max-w-[65ch] text-[12px] leading-relaxed text-ink-low">{hint}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* BADGES                                                                      */
/* -------------------------------------------------------------------------- */
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'violet' | 'cyan' | 'outline'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-white/[0.055] text-ink-mid border-line-2',
  accent: 'bg-accent/12 text-accent-ink border-accent/25',
  success: 'bg-emerald/12 text-emerald border-emerald/25',
  warn: 'bg-amber/12 text-amber border-amber/25',
  danger: 'bg-rose/12 text-rose border-rose/25',
  violet: 'bg-violet/12 text-violet border-violet/25',
  cyan: 'bg-cyan/12 text-cyan border-cyan/25',
  outline: 'bg-transparent text-ink-mid border-line-3',
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  dot,
  className,
  mono,
  style,
}: {
  children: ReactNode
  tone?: BadgeTone
  size?: 'xs' | 'sm'
  dot?: string
  className?: string
  mono?: boolean
  style?: React.CSSProperties
}) {
  return (
    <span
      style={style}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border font-medium',
        'transition-[background-color,border-color,color] duration-[var(--duration-2)] ease-[var(--ease-cockpit)]',
        size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[10.5px]',
        mono && 'mono',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  )
}

/** Small semantic label with a colored leading bar — used for statuses. */
export function StatusPill({ name, color, className, dim }: { name: string; color: string; className?: string; dim?: boolean }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium', className)} style={{ color: dim ? undefined : color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} />
      <span className={dim ? 'text-ink-mid' : undefined}>{name}</span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* DELTA                                                                       */
/* -------------------------------------------------------------------------- */
export function Delta({
  value,
  suffix = 'vs prev',
  size = 'sm',
  inverse,
  className,
}: {
  value: number
  suffix?: string
  size?: 'xs' | 'sm' | 'md'
  /** When true, a decrease is good (e.g. cost). */
  inverse?: boolean
  className?: string
}) {
  const positive = inverse ? value < 0 : value > 0
  const flat = Math.abs(value) < 0.05
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight
  const tone = flat ? 'text-ink-low' : positive ? 'text-emerald' : 'text-rose'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium',
        size === 'xs' && !flat && (positive ? 'bg-emerald/[0.09] px-1 py-px' : 'bg-rose/[0.09] px-1 py-px'),
        size === 'sm' && !flat && (positive ? 'bg-emerald/[0.08] px-1.5 py-0.5' : 'bg-rose/[0.08] px-1.5 py-0.5'),
        tone,
        className,
      )}
    >
      <Icon className={cn(size === 'xs' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden />
      <span className={cn('tnum', size === 'xs' ? 'text-[10.5px]' : size === 'md' ? 'text-[13px]' : 'text-[11.5px]')}>
        {flat ? '0.0%' : fmtSignedPercent(value)}
      </span>
      {suffix && <span className="text-[10.5px] font-normal text-ink-faint">{suffix}</span>}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* PROGRESS                                                                    */
/* -------------------------------------------------------------------------- */
export function Progress({
  value,
  max = 100,
  color = 'var(--color-accent)',
  size = 'sm',
  label,
  showValue,
  className,
  track,
}: {
  value: number
  max?: number
  color?: string
  size?: 'xs' | 'sm' | 'md'
  label?: string
  showValue?: boolean
  className?: string
  track?: boolean
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  const h = size === 'xs' ? 'h-[3px]' : size === 'md' ? 'h-2' : 'h-1.5'
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-[11.5px] text-ink-mid">{label}</span>}
          {showValue && <span className="mono text-[11px] text-ink">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full', track ? 'bg-white/[0.07]' : 'bg-white/[0.05]', h)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-cockpit)]"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}D9, ${color})`,
            boxShadow: `0 0 12px -2px ${color}`,
            animation: 'bar-grow 0.5s var(--ease-out-quint) both',
            transformOrigin: 'left center',
          }}
        />
      </div>
    </div>
  )
}

/** Radial progress used for scores and completion. */
export function Ring({
  value,
  size = 44,
  thickness = 3.5,
  color = 'var(--color-accent)',
  trackColor = 'rgba(255,255,255,0.07)',
  children,
  className,
}: {
  value: number
  size?: number
  thickness?: number
  color?: string
  trackColor?: string
  children?: ReactNode
  className?: string
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={
            {
              transition: 'stroke-dashoffset 760ms var(--ease-cockpit)',
              filter: `drop-shadow(0 0 5px ${color}66)`,
              animation: 'draw 820ms var(--ease-cockpit) both',
              '--dash-from': `${c}`,
              '--dash-to': `${c - (pct / 100) * c}`,
            } as React.CSSProperties
          }
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* AVATAR                                                                      */
/* -------------------------------------------------------------------------- */
export function Avatar({
  name,
  seed = 0,
  size = 28,
  src,
  className,
  ring,
}: {
  name: string
  seed?: number
  size?: number
  src?: string
  className?: string
  ring?: boolean
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  const hue = (seed * 47) % 360
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full', ring && 'ring-1 ring-line-3', className)}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, hsl(${hue} 42% 26%), hsl(${(hue + 40) % 360} 38% 16%))`,
      }}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="mono font-semibold text-ink-hi" style={{ fontSize: size * 0.36 }}>
          {initials || '—'}
        </span>
      )}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* SKELETON + STATES                                                           */
/* -------------------------------------------------------------------------- */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('shimmer rounded-md bg-white/[0.035]', className)} style={style} aria-hidden />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 12 - (i % 2) * 8}%` }} />
      ))}
    </div>
  )
}

export function Spinner({ size = 14, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <span className={cn('inline-block', className)} role="status" aria-label={label ?? 'Loading'}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  actions,
  className,
  compact,
}: {
  icon?: ReactNode
  title: string
  body?: string
  actions?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="relative mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line-2 bg-white/[0.025]">
        <span className="absolute inset-0 rounded-xl bg-accent/[0.07] blur-md animate-[breathe_3.6s_ease-in-out_infinite]" aria-hidden />
        <span className="relative text-ink-low [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon ?? <Minus className="h-4 w-4" />}</span>
      </div>
      <h3 className="text-[13.5px] font-semibold text-ink-hi">{title}</h3>
      {body && <p className="mt-1.5 max-w-[46ch] text-[12px] leading-relaxed text-ink-low">{body}</p>}
      {actions && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
  onCache,
  detail,
  className,
}: {
  title?: string
  body?: string
  onRetry?: () => void
  onCache?: () => void
  detail?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="relative mb-4 grid h-11 w-11 place-items-center rounded-xl border border-amber/25 bg-amber/[0.07]">
        <span className="absolute inset-0 rounded-xl bg-amber/[0.08] blur-md" aria-hidden />
        <AlertTriangle className="relative h-[18px] w-[18px] text-amber" />
      </div>
      <h3 className="text-[13.5px] font-semibold text-ink-hi">{title}</h3>
      {body && <p className="mt-1.5 max-w-[46ch] text-[12px] leading-relaxed text-ink-low">{body}</p>}
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-line-3 bg-white/[0.05] px-2.5 text-[12px] text-ink-hi transition-[background-color,border-color] duration-[var(--duration-2)] hover:border-line-4 hover:bg-white/[0.09] active:translate-y-px"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
        {onCache && (
          <button
            onClick={onCache}
            className="mono text-[11.5px] text-ink-low underline decoration-line-3 underline-offset-2 transition-colors hover:text-ink"
          >
            View cached data
          </button>
        )}
      </div>
      {detail && <p className="mono mt-4 max-w-[52ch] truncate rounded-md border border-line-1 bg-black/30 px-2.5 py-1.5 text-[10.5px] text-ink-faint">{detail}</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* KEY / VALUE                                                                 */
/* -------------------------------------------------------------------------- */
export function KeyValue({
  label,
  value,
  hint,
  className,
  mono,
  align = 'left',
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  className?: string
  mono?: boolean
  align?: 'left' | 'right'
}) {
  return (
    <div className={cn('min-w-0', align === 'right' && 'text-right', className)}>
      <dt className="cell-label truncate">{label}</dt>
      <dd className={cn('mt-1 truncate text-[12.5px] text-ink-hi', mono && 'mono text-[11.5px]')}>{value}</dd>
      {hint && <p className="mt-0.5 truncate text-[10.5px] text-ink-faint">{hint}</p>}
    </div>
  )
}

/** Inline link-out arrow used in dense rows. */
export function GoArrow({ className }: { className?: string }) {
  return <ArrowRight className={cn('h-3 w-3 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent', className)} />
}
