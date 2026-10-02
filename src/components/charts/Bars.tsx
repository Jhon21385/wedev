import { useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/cn'
import { fmtMetricFull, fmtMetricValue } from '@/lib/format'
import { ChartTooltip, GRID_STROKE, axisProps, type TooltipRenderProps, type TooltipRow } from './kit'

/* ============================================================================
   BAR FAMILY
   Vertical grouped/stacked bars for time-bucketed comparisons, and a
   horizontal variant used for ranked lists where labels matter more than dates.
   ========================================================================== */

interface Row extends Record<string, unknown> {
  label: string
}

export function MetricBars({
  rows,
  series,
  height = 220,
  stacked,
  showGrid = true,
  showLabels,
  className,
  onBarClick,
  horizontal,
}: {
  rows: Row[]
  series: { id: string; key: string; label: string; color: string; metricId: string; stackId?: string }[]
  height?: number
  stacked?: boolean
  showGrid?: boolean
  showLabels?: boolean
  className?: string
  onBarClick?: (row: Row) => void
  horizontal?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const metricId = series[0]?.metricId ?? 'views'

  const tooltip = (props: TooltipRenderProps) => {
    if (!props.active || !props.payload?.length) return null
    const datum = props.payload[0].payload as Row
    const rowsOut: TooltipRow[] = series.map((s) => ({
      label: s.label,
      value: Number(datum[s.key] ?? 0),
      color: s.color,
      metricId: s.metricId,
    }))
    const total = rowsOut.reduce((sum, r) => sum + r.value, 0)
    return (
      <ChartTooltip
        title={String(datum.label)}
        rows={rowsOut}
        footer={series.length > 1 ? `Total ${fmtMetricFull(metricId, total)}` : undefined}
      />
    )
  }

  const layout = horizontal ? 'vertical' : 'horizontal'

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <BarChart
        data={rows}
        layout={layout}
        margin={{ top: showLabels ? 16 : 6, right: 8, bottom: 0, left: horizontal ? 8 : -16 }}
        barCategoryGap={horizontal ? '22%' : '28%'}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.52} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && <CartesianGrid stroke={GRID_STROKE} vertical={horizontal} horizontal={!horizontal} />}
        {horizontal ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={(v: number) => fmtMetricValue(metricId, v)} />
            <YAxis type="category" dataKey="label" {...axisProps} width={104} tick={{ ...axisProps.tick, fontSize: 11 }} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
            <YAxis {...axisProps} width={58} tickFormatter={(v: number) => fmtMetricValue(metricId, v)} />
          </>
        )}
        <Tooltip content={tooltip} cursor={{ fill: 'rgba(255,255,255,0.035)' }} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={`url(#${uid}-${s.key})`}
            stackId={stacked ? (s.stackId ?? 'a') : undefined}
            radius={horizontal ? [0, 4, 4, 0] : [3, 3, 0, 0]}
            animationDuration={640}
            animationEasing="ease-out"
            onClick={onBarClick ? (d: unknown) => onBarClick((d as { payload?: Row })?.payload ?? (d as Row)) : undefined}
            style={{ cursor: onBarClick ? 'pointer' : undefined }}
          >
            {showLabels && !stacked && (
              <LabelList
                dataKey={s.key}
                position={horizontal ? 'right' : 'top'}
                formatter={(v: unknown) => fmtMetricValue(s.metricId, Number(v))}
                style={{ fill: '#9BA3B4', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Single-series ranked bars with per-row colour — used for platform / format
    comparisons where each category owns an identity colour. */
export function RankedBars({
  rows,
  metricId,
  height = 220,
  showValue = true,
  className,
  onSelect,
  max: forcedMax,
}: {
  rows: { label: string; value: number; color: string; id?: string; sub?: string }[]
  metricId: string
  height?: number
  showValue?: boolean
  className?: string
  onSelect?: (id: string) => void
  max?: number
}) {
  const max = forcedMax ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className={className} style={{ minHeight: height / rows.length }}>
      <ul className="flex h-full flex-col justify-center gap-2.5">
        {rows.map((r) => (
          <li key={r.id ?? r.label}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => r.id && onSelect?.(r.id)}
              className="group w-full text-left disabled:cursor-default"
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.color, boxShadow: `0 0 7px ${r.color}88` }} />
                  <span className="truncate text-[11.5px] text-ink-mid transition-colors group-hover:text-ink-hi">{r.label}</span>
                </span>
                {showValue && <span className="tnum shrink-0 text-[11.5px] font-medium text-ink-hi">{fmtMetricValue(metricId, r.value)}</span>}
              </div>
              <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/[0.045]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-cockpit)]"
                  style={{
                    width: `${Math.max(1.5, (r.value / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${r.color}66, ${r.color})`,
                    boxShadow: `0 0 10px -2px ${r.color}`,
                  }}
                />
              </div>
              {r.sub && <p className="mt-0.5 truncate text-[10px] text-ink-faint">{r.sub}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Stacked horizontal share bar — replaces pie charts everywhere. */
export function ShareBar({
  segments,
  height = 10,
  className,
  onHover,
  showLabels,
  rounded = true,
}: {
  segments: { id?: string; label: string; value: number; color: string }[]
  height?: number
  className?: string
  onHover?: (id: string | null) => void
  showLabels?: boolean
  rounded?: boolean
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className={className}>
      <div className={cn('flex w-full overflow-hidden', rounded && 'rounded-full')} style={{ height, background: 'rgba(255,255,255,0.04)' }}>
        {segments.map((s) => (
          <div
            key={s.id ?? s.label}
            onMouseEnter={() => onHover?.(s.id ?? s.label)}
            onMouseLeave={() => onHover?.(null)}
            title={`${s.label} — ${((s.value / total) * 100).toFixed(1)}%`}
            className="h-full transition-[opacity,filter] duration-200 first:rounded-l-full last:rounded-r-full hover:brightness-125"
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              boxShadow: `inset -1px 0 0 0 rgba(9,9,11,0.85)`,
            }}
          />
        ))}
      </div>
      {showLabels && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {segments.map((s) => (
            <li key={s.id ?? s.label} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[10.5px] text-ink-mid">{s.label}</span>
              <span className="tnum text-[10.5px] text-ink-faint">{((s.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* DISTRIBUTION — used by the audience screen                                  */
/* -------------------------------------------------------------------------- */
export function Distribution({
  rows,
  color = '#5B9DFF',
  height = 150,
  valueSuffix = '%',
  className,
}: {
  rows: { label: string; value: number }[]
  color?: string
  height?: number
  valueSuffix?: string
  className?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className={className} style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {rows.map((r) => (
          <div key={r.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="tnum text-[10.5px] font-medium text-ink-mid transition-colors group-hover:text-ink-hi">
              {r.value}
              {valueSuffix}
            </span>
            <div
              className="w-full rounded-t-[3px] transition-all duration-700 ease-[var(--ease-cockpit)] group-hover:brightness-125"
              style={{
                height: `${Math.max(3, (r.value / max) * 100)}%`,
                background: `linear-gradient(180deg, ${color}, ${color}55)`,
                boxShadow: `0 0 14px -6px ${color}`,
              }}
            />
            <span className="truncate text-[10px] text-ink-faint">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
