import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { metricById } from '@/data/registry'
import type { MetricId } from '@/data/types'
import { fmtMetricValue } from '@/lib/format'
import { ChartTooltip, GRID_STROKE, axisProps, type TooltipRenderProps, type TooltipRow } from './kit'

/* ============================================================================
   TIME SERIES
   One component covers the whole product's trend needs: single metric, stacked
   metrics (area), overlaid metrics with independent scales (line), and a
   comparison series drawn from a second field.
   ========================================================================== */

export interface MetricSeriesConfig {
  id: MetricId
  /** Field on the row object. Defaults to the metric id. */
  key?: string
  label?: string
  color?: string
  /** 'area' stacks with other area series; 'line' gets its own right axis. */
  type?: 'area' | 'line'
  /** Independent y-axis for metrics with a different magnitude. */
  axis?: 'left' | 'right'
  dashed?: boolean
}

interface Row extends Record<string, unknown> {
  date: string
  label: string
}

export function MetricTrend({
  rows,
  series,
  height = 240,
  mode = 'area',
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  compareLabel,
  compareKey,
  onPointClick,
  className,
  valueFormatter,
}: {
  rows: Row[]
  series: MetricSeriesConfig[]
  height?: number
  mode?: 'area' | 'line' | 'stacked'
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  compareLabel?: string
  /** Row field holding the comparison series. */
  compareKey?: string
  onPointClick?: (row: Row) => void
  className?: string
  valueFormatter?: (metricId: string, value: number) => string
}) {
  const uid = useId().replace(/:/g, '')
  const resolved = useMemo(
    () =>
      series.map((s) => {
        const def = metricById(s.id)
        return { ...s, def, key: s.key ?? s.id, color: s.color ?? def.color, label: s.label ?? def.label }
      }),
    [series],
  )

  const hasRight = resolved.some((s) => s.axis === 'right')
  const firstMetric = resolved[0]?.id ?? 'views'

  const tickFmt = (metricId: string) => (v: number) =>
    valueFormatter ? valueFormatter(metricId, v) : fmtMetricValue(metricId, v)

  const tooltip = (props: TooltipRenderProps) => {
    if (!props.active || !props.payload?.length) return null
    const datum = props.payload[0].payload as Row
    if (!datum) return null
    const rowsOut: TooltipRow[] = resolved.map((s) => ({
      label: s.label,
      value: Number(datum[s.key] ?? 0),
      color: s.color,
      metricId: s.id,
      share: undefined,
    }))
    if (compareKey && compareLabel) {
      rowsOut.forEach((r) => {
        r.compare = { label: compareLabel, value: Number(datum[compareKey] ?? 0) }
      })
    }
    return <ChartTooltip title={datum.label} subtitle={datum.date as string} rows={rowsOut} />
  }

  const common = {
    data: rows,
    margin: { top: 6, right: hasRight ? 4 : 8, bottom: 0, left: -14 },
  }

  if (mode === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height} className={className}>
        <LineChart {...common}>
          {showGrid && <CartesianGrid stroke={GRID_STROKE} vertical={false} />}
          {showXAxis && <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={26} />}
          {showYAxis && <YAxis {...axisProps} width={58} tickFormatter={tickFmt(firstMetric)} />}
          {hasRight && <YAxis yAxisId="right" orientation="right" {...axisProps} width={52} tickFormatter={tickFmt(resolved.find((s) => s.axis === 'right')!.id)} />}
          <Tooltip content={tooltip} cursor={{ stroke: 'rgba(91,157,255,0.35)', strokeWidth: 1 }} />
          {compareKey && (
            <Line
              type="monotone"
              dataKey={compareKey}
              stroke="rgba(255,255,255,0.24)"
              strokeWidth={1.4}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              isAnimationActive
              animationDuration={520}
            />
          )}
          {resolved.map((s) => (
            <Line
              key={s.key}
              yAxisId={s.axis === 'right' ? 'right' : undefined}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '4 3' : undefined}
              dot={false}
              activeDot={{ r: 3.5, fill: s.color, stroke: '#0B0D11', strokeWidth: 2 }}
              animationDuration={620}
              animationEasing="ease-out"
              onClick={onPointClick ? (d: unknown) => onPointClick((d as { payload?: Row })?.payload ?? (d as Row)) : undefined}
            />
          ))}
          {!compareKey && resolved.length === 1 && <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart {...common}>
        <defs>
          {resolved.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={mode === 'stacked' ? 0.42 : 0.32} />
              <stop offset="55%" stopColor={s.color} stopOpacity={0.1} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && <CartesianGrid stroke={GRID_STROKE} vertical={false} />}
        {showXAxis && <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={26} />}
        {showYAxis && <YAxis {...axisProps} width={58} tickFormatter={tickFmt(firstMetric)} />}
        <Tooltip content={tooltip} cursor={{ stroke: 'rgba(91,157,255,0.35)', strokeWidth: 1 }} />
        {resolved.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={mode === 'stacked' ? 1.4 : 2}
            fill={`url(#${uid}-${s.key})`}
            stackId={mode === 'stacked' ? '1' : undefined}
            animationDuration={680}
            animationEasing="ease-out"
            activeDot={{ r: 3.5, fill: s.color, stroke: '#0B0D11', strokeWidth: 2 }}
            style={{ filter: `drop-shadow(0 0 6px ${s.color}${i === 0 ? '55' : '00'})` }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* -------------------------------------------------------------------------- */
/* SPARKLINE — inline, no axes, used inside metric tiles and table cells        */
/* -------------------------------------------------------------------------- */
export function Sparkline({
  values,
  color = '#5B9DFF',
  width = 68,
  height = 22,
  filled = true,
  strokeWidth = 1.5,
  className,
  ariaLabel,
}: {
  values: number[]
  color?: string
  width?: number
  height?: number
  filled?: boolean
  strokeWidth?: number
  className?: string
  ariaLabel?: string
}) {
  const uid = useId().replace(/:/g, '')
  const path = useMemo(() => {
    if (values.length < 2) return { line: '', area: '' }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const step = width / (values.length - 1)
    const pts = values.map((v, i) => [i * step, height - ((v - min) / span) * (height - 4) - 2] as const)
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `${line} L${width},${height} L0,${height} Z`
    return { line, area }
  }, [values, width, height])

  if (values.length < 2) return <span className={className} style={{ width, height }} aria-hidden />

  return (
    <svg width={width} height={height} className={className} aria-label={ariaLabel} role={ariaLabel ? 'img' : 'presentation'} aria-hidden={!ariaLabel}>
      {filled && (
        <>
          <defs>
            <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={path.area} fill={`url(#spark-${uid})`} />
        </>
      )}
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="400"
        style={{ ['--dash-from' as string]: '400', ['--dash-to' as string]: '0', animation: 'draw 900ms var(--ease-cockpit) both' }}
      />
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - Math.min(...values)) / (Math.max(...values) - Math.min(...values) || 1)) * (height - 4) - 2}
        r={1.7}
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}
