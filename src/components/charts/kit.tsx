import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fmtMetricFull, fmtMetricValue } from '@/lib/format'
import { EmptyState, Spinner } from '@/components/ui/Surface'

/* ============================================================================
   CHART KIT
   Shared substrate for every visualisation: consistent grid, axis tone, legend
   behaviour, and one tooltip component that always answers metric · value ·
   change · context.
   ========================================================================== */

export const GRID_STROKE = 'rgba(255,255,255,0.045)'
export const AXIS_TICK = { fill: '#6A7284', fontSize: 10.5 }
export const CHART_COLORS = ['#5B9DFF', '#38D6F5', '#A78BFA', '#34D399', '#FBBF24', '#FB7185', '#2DD4BF', '#7C5CF5']

export const axisProps = {
  stroke: 'rgba(255,255,255,0.07)',
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
} as const

export interface TooltipRow {
  label: string
  value: number
  color: string
  metricId: string
  /** Optional comparison for the same point. */
  compare?: { label: string; value: number }
  share?: number
}

/**
 * The product's single tooltip. Structure is fixed on purpose:
 *   metric name → exact value → change vs comparison → share of total.
 */
export function ChartTooltip({
  title,
  subtitle,
  rows,
  footer,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  rows: TooltipRow[]
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none min-w-[186px] animate-[pop_.18s_var(--ease-cockpit)_both] rounded-lg border border-line-3 bg-[#0B0D11]/96 px-3 py-2.5 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.98)] backdrop-blur-xl',
        className,
      )}
      role="tooltip"
    >
      <p className="text-[11px] font-medium text-ink-hi">{title}</p>
      {subtitle && <p className="mono mt-0.5 text-[10px] text-ink-faint">{subtitle}</p>}
      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline gap-2.5">
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}88` }} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-ink-mid">{r.label}</span>
            <span className="tnum shrink-0 text-[12px] font-semibold text-ink-hi">{fmtMetricFull(r.metricId, r.value)}</span>
          </div>
        ))}
        {rows
          .filter((r) => r.compare)
          .map((r, i) => {
            const change = r.compare && r.compare.value ? ((r.value - r.compare.value) / Math.abs(r.compare.value)) * 100 : 0
            const up = change >= 0
            return (
              <div key={`c-${i}`} className="flex items-baseline justify-between gap-2 border-t border-line-2 pt-1.5">
                <span className="text-[10.5px] text-ink-faint">{r.compare!.label}</span>
                <span className={cn('tnum text-[11px] font-medium', up ? 'text-emerald' : 'text-rose')}>
                  {up ? '+' : '−'}
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )
          })}
      </div>
      {footer && <div className="mt-2 border-t border-line-2 pt-1.5 text-[10.5px] text-ink-faint">{footer}</div>}
    </div>
  )
}

/**
 * Structural tooltip props. Recharts' generic tooltip payload is intentionally
 * narrowed to what this product actually reads: the hovered datum.
 */
export interface TooltipRenderProps {
  active?: boolean
  payload?: readonly { payload?: unknown }[] | undefined
  label?: unknown
}

/* -------------------------------------------------------------------------- */
/* FRAME                                                                       */
/* -------------------------------------------------------------------------- */
export function ChartFrame({
  title,
  subtitle,
  legend,
  actions,
  children,
  height,
  className,
  dense,
  loading,
  empty,
  emptyBody,
  /** Screen-reader summary of what the chart shows. Required for a11y. */
  summary,
  footer,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  legend?: ReactNode
  actions?: ReactNode
  children: ReactNode
  height?: number | string
  className?: string
  dense?: boolean
  loading?: boolean
  empty?: boolean
  emptyBody?: string
  summary?: string
  footer?: ReactNode
}) {
  return (
    <div className={cn('relative flex min-w-0 flex-col', className)}>
      {(title || actions) && (
        <div className={cn('flex items-start justify-between gap-3', dense ? 'mb-2' : 'mb-3')}>
          <div className="min-w-0">
            {title && <h3 className="truncate text-[12.5px] font-semibold text-ink-hi">{title}</h3>}
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-ink-low">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {legend}
            {actions}
          </div>
        </div>
      )}
      {summary && <p className="sr-only">{summary}</p>}
      <div
        className="relative min-w-0 flex-1"
        style={height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
      >
        {loading ? (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner />
          </div>
        ) : empty ? (
          <div className="absolute inset-0 grid place-items-center">
            <EmptyState compact title="No data in this range" body={emptyBody ?? 'Widen the period or clear a filter to populate this view.'} />
          </div>
        ) : (
          children
        )}
      </div>
      {footer && <div className="mt-2 text-[10.5px] text-ink-faint">{footer}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* LEGEND — interactive, always paired with colour meaning                      */
/* -------------------------------------------------------------------------- */
export function Legend({
  items,
  active,
  onToggle,
  onHover,
  className,
  size = 'sm',
}: {
  items: { id: string; label: string; color: string; value?: string; muted?: boolean }[]
  active?: string[]
  onToggle?: (id: string) => void
  onHover?: (id: string | null) => void
  className?: string
  size?: 'xs' | 'sm'
}) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5', className)}>
      {items.map((it) => {
        const on = !active || active.includes(it.id)
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onToggle?.(it.id)}
              onMouseEnter={() => onHover?.(it.id)}
              onMouseLeave={() => onHover?.(null)}
              disabled={!onToggle}
              aria-pressed={on ? true : false}
              className={cn(
                'group inline-flex items-center gap-1.5 transition-opacity duration-200',
                onToggle ? 'cursor-pointer' : 'cursor-default',
                !on && 'opacity-35',
                it.muted && 'opacity-60',
              )}
            >
              <span
                className="h-[3px] w-3.5 rounded-full transition-all duration-200"
                style={{ background: it.color, boxShadow: on ? `0 0 8px -1px ${it.color}` : 'none' }}
              />
              <span className={cn(size === 'xs' ? 'text-[10px]' : 'text-[10.5px]', 'text-ink-mid group-hover:text-ink')}>{it.label}</span>
              {it.value && <span className="tnum text-[10px] text-ink-faint">{it.value}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Recharts tooltip adapter                                                    */
/* -------------------------------------------------------------------------- */
export function adaptPayload<T extends Record<string, unknown>>(
  payload: { dataKey?: string | number; value?: unknown; payload?: T; color?: string }[],
  config: { key: string; label: string; metricId: string; color: string }[],
) {
  const datum = payload?.[0]?.payload
  return { datum, map: config }
}

/** Formatting helper reused by every axis. */
export function tickFormatter(metricId: string) {
  return (value: number) => fmtMetricValue(metricId, value)
}

export { fmtMetricValue, fmtMetricFull }

/* -------------------------------------------------------------------------- */
/* Axis helper components kept here so charts stay declarative                  */
/* -------------------------------------------------------------------------- */
export function NoDataOverlay({ label = 'No data' }: { label?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <span className="mono rounded-md border border-line-2 bg-black/40 px-2 py-1 text-[10.5px] text-ink-faint">{label}</span>
    </div>
  )
}
