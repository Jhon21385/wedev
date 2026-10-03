import { useMemo, useState, type ReactNode } from 'react'
import { LineChart as LineChartIcon, Table2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmtMetricFull, fmtMetricValue, fmtNumber } from '@/lib/format'
import { EmptyState, Spinner } from '@/components/ui/Surface'
import { Tooltip } from '@/components/ui/Tooltip'

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
/* CHART PANEL — the container every visualisation lives in                     */
/*                                                                              */
/* Two obligations it discharges so individual charts never have to:            */
/*   1. An accessible summary. Pass `summary` for a hand-written one, or pass   */
/*      `data` and a faithful description is derived from the actual series —   */
/*      span, extremes and net direction — so it can never drift.               */
/*   2. "Show as table". Every chart has an equivalent data view; the numbers   */
/*      behind a visual must be reachable by keyboard and by screen reader.     */
/* -------------------------------------------------------------------------- */

export interface ChartDataColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  /** Numeric columns get range/direction stats in the generated summary. */
  format?: (value: number) => string
}

export interface ChartData {
  columns: ChartDataColumn[]
  rows: Record<string, string | number>[]
  /** What one row represents, e.g. "day", "content item", "topic". */
  unit?: string
  caption?: string
}

/** Convenience builder so call sites read as a table, not a nested literal. */
export function chartData(
  columns: ChartDataColumn[],
  rows: Record<string, string | number>[],
  extra: { unit?: string; caption?: string } = {},
): ChartData {
  return { columns, rows, ...extra }
}

/**
 * Derives a spoken description of a series. Deliberately terse: what it is,
 * how much of it there is, where it starts and ends, and which way it moved.
 */
export function summarizeChart(title: string, data: ChartData): string {
  const { columns, rows, unit } = data
  if (!rows.length) return `${title}. No data in the current scope.`

  const labelOf = (row: Record<string, string | number>) => String(columns.find((c) => c.align !== 'right')?.key ? row[columns[0].key] ?? '' : row[columns[0].key] ?? '')
  const first = rows[0]
  const last = rows[rows.length - 1]
  const span = unit ? `${rows.length} ${unit}${rows.length === 1 ? '' : 's'}` : `${rows.length} points`

  const parts: string[] = [`${title}. ${span} from ${labelOf(first)} to ${labelOf(last)}.`]

  for (const col of columns) {
    const values = rows.map((r) => Number(r[col.key])).filter((v) => Number.isFinite(v))
    if (!values.length) continue
    const fmt = col.format ?? ((v: number) => fmtNumber(v, { compact: true }))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const minRow = rows[values.indexOf(min)]
    const maxRow = rows[values.indexOf(max)]
    if (min === max) {
      parts.push(`${col.label} is flat at ${fmt(min)}.`)
      continue
    }
    const start = values[0]
    const end = values[values.length - 1]
    const change = start ? ((end - start) / Math.abs(start)) * 100 : 0
    const direction = Math.abs(change) < 1 ? 'level' : change > 0 ? `up ${Math.abs(change).toFixed(1)}%` : `down ${Math.abs(change).toFixed(1)}%`
    parts.push(
      `${col.label}: ${direction} across the window, low ${fmt(min)} at ${labelOf(minRow)}, high ${fmt(max)} at ${labelOf(maxRow)}.`,
    )
  }
  return parts.join(' ')
}

export function ChartPanel({
  title,
  subtitle,
  icon,
  actions,
  legend,
  /** Hand-written screen-reader summary. Derived from `data` when omitted. */
  summary,
  /** Underlying series. Enables the "show as table" view. */
  data,
  children,
  className,
  bodyClassName,
  dense,
  height,
  footer,
  loading,
  empty,
  emptyBody,
  glow,
  /** Drop the header chrome and float the toggle over the chart instead. For
      charts that live inside a panel that already has its own header. */
  bare,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  legend?: ReactNode
  summary?: string
  data?: ChartData
  children: ReactNode
  className?: string
  bodyClassName?: string
  dense?: boolean
  height?: number | string
  footer?: ReactNode
  loading?: boolean
  empty?: boolean
  emptyBody?: string
  glow?: 0 | 1 | 2 | 3
  bare?: boolean
}) {
  const [asTable, setAsTable] = useState(false)

  const spoken = useMemo(() => {
    if (summary) return summary
    if (!data) return undefined
    return summarizeChart(typeof title === 'string' ? title : 'Chart', data)
  }, [summary, data, title])

  const toggle = data ? (
    <Tooltip content={asTable ? 'Show chart' : 'Show as table'} side="left">
      <button
        type="button"
        onClick={() => setAsTable((v) => !v)}
        aria-pressed={asTable}
        aria-label={asTable ? `Show ${typeof title === 'string' ? title : 'this chart'} as a chart` : `Show ${typeof title === 'string' ? title : 'this chart'} as a table`}
        className={cn(
          'grid h-6 w-6 place-items-center rounded-md border transition-all duration-[var(--duration-2)] ease-[var(--ease-cockpit)]',
          asTable
            ? 'border-accent/35 bg-accent/[0.12] text-accent shadow-[0_0_16px_-6px_rgba(91,157,255,0.8)]'
            : 'border-transparent text-ink-faint opacity-0 hover:border-line-2 hover:bg-white/[0.06] hover:text-ink group-hover/chart:opacity-100 focus-visible:opacity-100',
          bare && 'bg-[#0D0F13]/85 backdrop-blur-sm',
        )}
      >
        {asTable ? <LineChartIcon className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
      </button>
    </Tooltip>
  ) : null

  if (bare) {
    return (
      <div className={cn('group/chart relative min-w-0', className)}>
        {spoken && <p className="sr-only">{spoken}</p>}
        {data && <div className="absolute right-0 top-0 z-[3]">{toggle}</div>}
        <div
          className="relative min-w-0"
          style={height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
        >
          {loading ? (
            <div className="grid place-items-center py-8">
              <Spinner />
            </div>
          ) : empty ? (
            <EmptyState compact title="No data in this range" body={emptyBody} />
          ) : asTable && data ? (
            <ChartDataTable data={data} />
          ) : (
            children
          )}
        </div>
      </div>
    )
  }

  return (
    <section
      className={cn(
        'group/chart relative flex min-w-0 flex-col rounded-xl border border-line-2 bg-panel',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.022),0_1px_2px_0_rgba(0,0,0,0.3)]',
        'transition-[border-color,box-shadow] duration-250 ease-[var(--ease-cockpit)]',
        glow === 2 && 'glow-2',
        glow === 3 && 'glow-3',
        glow === 1 && 'hover:shadow-[0_0_26px_-10px_rgba(91,157,255,0.4)]',
        className,
      )}
    >
      {(title || actions || legend || data) && (
        <header
          className={cn(
            'relative flex items-start justify-between gap-4 border-b border-line-1',
            dense ? 'px-3 py-2' : 'px-4 py-3',
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && <span className="mt-px shrink-0 text-ink-low [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className="truncate text-[12.5px] font-semibold tracking-[-0.012em] text-ink-hi">{title}</h3>}
              {subtitle && <p className="mt-0.5 max-w-[92ch] text-[11.5px] leading-snug text-ink-low">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {legend}
            {actions}
            {toggle}
          </div>
        </header>
      )}

      {spoken && <p className="sr-only">{spoken}</p>}

      <div
        className={cn('relative min-w-0 flex-1', bodyClassName ?? 'p-4')}
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
        ) : asTable && data ? (
          <ChartDataTable data={data} />
        ) : (
          children
        )}
      </div>

      {footer && <div className="border-t border-line-1 px-4 py-2 text-[10.5px] text-ink-faint">{footer}</div>}
    </section>
  )
}

/**
 * The table behind a chart. Real `<table>` semantics, sticky header, tabular
 * numerals and a visible caption — the same information, no loss of fidelity.
 */
function ChartDataTable({ data }: { data: ChartData }) {
  return (
    <div className="max-h-[340px] animate-[fade-in_200ms_var(--ease-cockpit)_both] overflow-auto rounded-lg border border-line-1">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          {data.caption ?? `Data behind the chart, ${data.rows.length} rows`}
        </caption>
        <thead className="sticky top-0 z-[1] bg-surface-1/95 backdrop-blur-xl">
          <tr>
            {data.columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn('whitespace-nowrap border-b border-line-2 px-3 py-1.5 cell-label', c.align === 'right' && 'text-right')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-b border-line-1 last:border-0 hover:bg-white/[0.03]">
              {data.columns.map((c) => {
                const raw = row[c.key]
                const numeric = typeof raw === 'number'
                return (
                  <td
                    key={c.key}
                    className={cn(
                      'whitespace-nowrap px-3 py-1.5 text-[11.5px] text-ink',
                      c.align === 'right' && 'text-right',
                      numeric && 'tnum',
                    )}
                  >
                    {numeric && c.format ? c.format(raw as number) : numeric ? fmtNumber(raw as number) : (raw ?? '—')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
