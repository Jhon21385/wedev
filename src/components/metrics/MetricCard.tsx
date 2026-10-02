import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmtMetricFull, fmtMetricValue } from '@/lib/format'
import { metricById } from '@/data/registry'
import { Delta } from '@/components/ui/Surface'
import { Sparkline } from '@/components/charts/LineArea'
import { Tooltip } from '@/components/ui/Tooltip'

/* ============================================================================
   METRIC PRIMITIVES
   Three densities of the same idea, so a number's weight communicates its
   importance instead of every metric getting an identical card:
     · MetricHero   — the one number that owns the panel
     · MetricCard   — a first-class KPI with trend + comparison
     · MetricInline — a dense row value inside lists and rails
   ========================================================================== */

export function MetricCard({
  metricId,
  value,
  delta,
  spark,
  color,
  icon,
  context,
  onClick,
  active,
  className,
  footer,
  size = 'md',
}: {
  metricId: string
  value: number
  delta?: number
  spark?: number[]
  color?: string
  icon?: ReactNode
  /** Extra context shown under the value — e.g. "42 published pieces". */
  context?: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const def = metricById(metricId as never)
  const accent = color ?? def.color
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-panel text-left',
        'transition-[border-color,box-shadow,background-color] duration-250 ease-[var(--ease-cockpit)]',
        active ? 'border-accent/40 glow-2' : 'border-line-2',
        onClick && 'hover:border-line-3 hover:bg-surface-1',
        size === 'sm' ? 'p-3' : size === 'lg' ? 'p-4' : 'p-3.5',
        className,
      )}
    >
      {active && <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" aria-hidden />}

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {icon && <span className="shrink-0 text-ink-low [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
          <span className="cell-label truncate">{def.label}</span>
        </div>
        {def.description && (
          <Tooltip content={def.description} side="bottom">
            <Info className="h-3 w-3 shrink-0 text-ink-ghost transition-colors group-hover:text-ink-low" />
          </Tooltip>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'tnum font-semibold leading-none tracking-[-0.02em] text-ink-hi',
              size === 'sm' ? 'text-[17px]' : size === 'lg' ? 'text-[30px]' : 'text-[23px]',
            )}
          >
            {fmtMetricValue(metricId, value)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {delta !== undefined && <Delta value={delta} size="xs" />}
            {context && <span className="truncate text-[10.5px] text-ink-faint">{context}</span>}
          </div>
        </div>
        {spark && spark.length > 2 && (
          <Sparkline values={spark} color={accent} width={size === 'sm' ? 52 : 72} height={size === 'lg' ? 34 : 26} ariaLabel={`${def.label} trend`} />
        )}
      </div>

      {footer && <div className="mt-3 border-t border-line-1 pt-2.5">{footer}</div>}

      {/* baseline meter: share of the panel's own scale */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        aria-hidden
      />
    </Tag>
  )
}

export function MetricHero({
  label,
  value,
  unit,
  delta,
  spark,
  color = '#5B9DFF',
  children,
  className,
  action,
}: {
  label: string
  value: string
  unit?: string
  delta?: number
  spark?: number[]
  color?: string
  children?: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="cell-label">{label}</span>
        </div>
        {action}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
        <span className="tnum text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink-hi">{value}</span>
        {unit && <span className="text-[12px] text-ink-low">{unit}</span>}
        {delta !== undefined && <Delta value={delta} size="md" className="mb-0.5" />}
      </div>
      {children}
      {spark && spark.length > 2 && <Sparkline values={spark} color={color} width={140} height={30} className="mt-2" filled ariaLabel={`${label} trend`} />}
    </div>
  )
}

export function MetricInline({
  metricId,
  value,
  delta,
  className,
  align = 'left',
}: {
  metricId: string
  value: number
  delta?: number
  className?: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={cn('flex items-baseline gap-2', align === 'right' && 'justify-end', className)}>
      <span className="tnum text-[12.5px] font-medium text-ink-hi" title={fmtMetricFull(metricId, value)}>
        {fmtMetricValue(metricId, value)}
      </span>
      {delta !== undefined && <Delta value={delta} size="xs" suffix={undefined} />}
    </div>
  )
}

/** Compact clickable metric used in the dashboard pulse row. */
export function PulseChip({
  label,
  value,
  delta,
  color,
  spark,
  onClick,
  active,
}: {
  label: string
  value: string
  delta: number
  color: string
  spark: number[]
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-250',
        active ? 'border-accent/35 bg-accent/[0.07]' : 'border-line-2 bg-panel hover:border-line-3 hover:bg-surface-1',
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full transition-shadow" style={{ background: color, boxShadow: active ? `0 0 8px ${color}` : undefined }} />
        <span className="truncate text-[10.5px] font-medium text-ink-mid">{label}</span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="tnum text-[16px] font-semibold leading-none text-ink-hi">{value}</span>
        <Sparkline values={spark} color={color} width={46} height={18} filled={active} />
      </span>
      <Delta value={delta} size="xs" suffix={undefined} />
    </button>
  )
}
