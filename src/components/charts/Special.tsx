import { useMemo, useState } from 'react'
import { Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/cn'
import { fmtMetricValue, fmtNumber, fmtDateFull } from '@/lib/format'
import { axisProps, GRID_STROKE } from './kit'

/* ============================================================================
   SPECIALIST VISUALISATIONS
   Hand-built SVG/canvas-free widgets for the shapes Recharts does not do well:
   calendar heat, correlation matrices, bubble matrices, funnels, treemaps,
   radar, activity grids and retention bands. Full control = full polish.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* CALENDAR HEATMAP                                                            */
/* -------------------------------------------------------------------------- */
export function CalendarHeat({
  cells,
  weeks = 27,
  color = '#5B9DFF',
  className,
  onSelectDay,
  labels = true,
}: {
  cells: { date: string; value: number; intensity: number; published: number }[]
  weeks?: number
  color?: string
  className?: string
  onSelectDay?: (date: string) => void
  labels?: boolean
}) {
  const [hover, setHover] = useState<{ x: number; y: number; cell: (typeof cells)[number] } | null>(null)

  const grid = useMemo(() => {
    if (!cells.length) return { columns: [] as (typeof cells)[number][][], monthTicks: [] as { col: number; label: string }[] }
    const first = new Date(cells[0].date + 'T00:00:00')
    const pad = (first.getDay() + 6) % 7
    const padded: ((typeof cells)[number] | null)[] = [...Array.from({ length: pad }, () => null), ...cells]
    const columns: (typeof cells)[number][][] = []
    for (let i = 0; i < padded.length; i += 7) {
      columns.push(padded.slice(i, i + 7).filter(Boolean) as (typeof cells)[number][])
    }
    const monthTicks: { col: number; label: string }[] = []
    let lastMonth = -1
    columns.forEach((col, i) => {
      const d = col[0] ? new Date(col[0].date + 'T00:00:00') : null
      if (d && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth()
        monthTicks.push({ col: i, label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] })
      }
    })
    return { columns: columns.slice(-weeks), monthTicks: monthTicks.filter((t) => t.col >= columns.length - weeks) }
  }, [cells, weeks])

  const cell = 11
  const gap = 3

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {labels && (
          <div className="flex shrink-0 flex-col gap-[3px] pt-[15px]">
            {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => (
              <span key={i} className="h-[11px] leading-[11px] text-[9px] text-ink-faint">
                {d}
              </span>
            ))}
          </div>
        )}
        <div className="min-w-0">
          {labels && (
            <div className="relative mb-1 h-3">
              {grid.monthTicks.map((t) => (
                <span key={t.col + t.label} className="absolute text-[9.5px] text-ink-faint" style={{ left: t.col * (cell + gap) }}>
                  {t.label}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-[3px]" role="img" aria-label="Publishing and reach calendar heatmap">
            {grid.columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, ri) => {
                  const c = col.find((x) => (new Date(x.date + 'T00:00:00').getDay() + 6) % 7 === ri)
                  if (!c)
                    return <span key={ri} style={{ width: cell, height: cell }} className="rounded-[2.5px] bg-white/[0.015]" aria-hidden />
                  const alpha = 0.08 + c.intensity * 0.82
                  return (
                    <button
                      key={ri}
                      onClick={() => onSelectDay?.(c.date)}
                      onMouseEnter={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setHover({ x: r.left + r.width / 2, y: r.top, cell: c })
                      }}
                      onMouseLeave={() => setHover(null)}
                      aria-label={`${c.date}: ${fmtNumber(c.value)} reach, ${c.published} published`}
                      className="relative rounded-[2.5px] transition-[transform,box-shadow] duration-150 hover:z-10 hover:scale-[1.28]"
                      style={{
                        width: cell,
                        height: cell,
                        background: c.intensity === 0 ? 'rgba(255,255,255,0.035)' : `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
                        boxShadow: c.intensity > 0.65 ? `0 0 6px -1px ${color}77` : undefined,
                      }}
                    >
                      {c.published > 0 && (
                        <span className="absolute inset-0 m-auto h-[3px] w-[3px] rounded-full bg-white/85 shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-faint">Less</span>
          {[0.1, 0.3, 0.55, 0.78, 1].map((v) => (
            <span key={v} className="h-[9px] w-[9px] rounded-[2.5px]" style={{ background: `${color}${Math.round((0.08 + v * 0.82) * 255).toString(16).padStart(2, '0')}` }} />
          ))}
          <span className="text-[10px] text-ink-faint">More</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          <span className="h-[3px] w-[3px] rounded-full bg-white/85" /> published
        </span>
      </div>

      {hover && <HeatTip x={hover.x} y={hover.y} cell={hover.cell} />}
    </div>
  )
}

function HeatTip({ x, y, cell }: { x: number; y: number; cell: { date: string; value: number; published: number } }) {
  return (
    <div
      className="pointer-events-none fixed z-[125] -translate-x-1/2 -translate-y-full animate-[scale-in_120ms_var(--ease-cockpit)_both] rounded-lg border border-line-3 bg-[#0B0D11]/97 px-2.5 py-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      style={{ left: x, top: y - 8 }}
    >
      <p className="text-[11px] font-medium text-ink-hi">{fmtDateFull(cell.date)}</p>
      <p className="tnum mt-0.5 text-[10.5px] text-ink-mid">{fmtNumber(cell.value)} impressions</p>
      {cell.published > 0 && <p className="mt-0.5 text-[10.5px] text-accent">{cell.published} published</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* HEAT GRID — topic × metric correlation                                      */
/* -------------------------------------------------------------------------- */
export function HeatGrid({
  rows,
  columns,
  values,
  color = '#5B9DFF',
  className,
  formatter = (v: number) => fmtNumber(v, { compact: v >= 1000 }),
  onCellClick,
}: {
  rows: { id: string; label: string; sub?: string }[]
  columns: { id: string; label: string; short?: string }[]
  /** values[rowIndex][colIndex] in 0..1 normalised, plus raw for the tooltip. */
  values: { norm: number; raw: number }[][]
  color?: string
  className?: string
  formatter?: (v: number) => string
  onCellClick?: (rowId: string, colId: string) => void
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-separate border-spacing-[2px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-panel pr-3 text-left">
              <span className="cell-label">Topic</span>
            </th>
            {columns.map((c) => (
              <th key={c.id} className="pb-1.5">
                <span className="mono block text-center text-[9.5px] font-medium uppercase tracking-[0.06em] text-ink-low" title={c.label}>
                  {c.short ?? c.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.id}>
              <td className="sticky left-0 z-10 max-w-[150px] bg-panel pr-3">
                <span className="block truncate text-[11.5px] text-ink-mid" title={r.label}>
                  {r.label}
                </span>
                {r.sub && <span className="mono block text-[9.5px] text-ink-faint">{r.sub}</span>}
              </td>
              {columns.map((c, ci) => {
                const v = values[ri]?.[ci] ?? { norm: 0, raw: 0 }
                const alpha = 0.06 + v.norm * 0.86
                const isHover = hover?.r === ri && hover?.c === ci
                return (
                  <td key={c.id} className="p-0">
                    <button
                      onMouseEnter={() => setHover({ r: ri, c: ci })}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onCellClick?.(r.id, c.id)}
                      aria-label={`${r.label} ${c.label}: ${formatter(v.raw)}`}
                      className={cn(
                        'group relative flex h-9 w-full min-w-[54px] items-center justify-center rounded-[5px] transition-all duration-200',
                        isHover && 'z-10 scale-[1.06] ring-1 ring-white/25',
                      )}
                      style={{
                        background: v.raw === 0 ? 'rgba(255,255,255,0.028)' : `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
                      }}
                    >
                      <span
                        className={cn(
                          'tnum text-[10.5px] font-medium transition-opacity duration-200',
                          v.norm > 0.5 ? 'text-white/95' : 'text-ink-mid',
                          isHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                      >
                        {formatter(v.raw)}
                      </span>
                    </button>
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
/* ACTIVITY GRID — weekday × hour audience density                             */
/* -------------------------------------------------------------------------- */
export function ActivityGrid({
  rows,
  hours,
  color = '#38D6F5',
  className,
}: {
  rows: { day: string; values: number[] }[]
  hours: number[]
  color?: string
  className?: string
}) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-1.5">
        <div className="flex shrink-0 flex-col gap-[3px] pt-[18px]">
          {rows.map((r) => (
            <span key={r.day} className="h-[13px] text-[9.5px] leading-[13px] text-ink-faint">
              {r.day}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex gap-[3px]">
            {hours.map((h) => (
              <span key={h} className="flex-1 text-center text-[9px] text-ink-faint">
                {h % 6 === 0 ? (h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`) : ''}
              </span>
            ))}
          </div>
          <div className="space-y-[3px]">
            {rows.map((r, di) => (
              <div key={r.day} className="flex gap-[3px]">
                {r.values.map((v, hi) => (
                  <button
                    key={hi}
                    onMouseEnter={() => setHover({ d: di, h: hi })}
                    onMouseLeave={() => setHover(null)}
                    aria-label={`${r.day} ${hi}:00 — ${v}% of peak activity`}
                    className={cn('h-[13px] flex-1 rounded-[3px] transition-all duration-150 hover:scale-y-[1.35]', hover?.d === di && hover?.h === hi && 'ring-1 ring-white/30')}
                    style={{ background: `${color}${Math.round((0.05 + (v / 100) * 0.9) * 255).toString(16).padStart(2, '0')}` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3">
        {hover && (
          <span className="mono text-[10.5px] text-ink-mid">
            {rows[hover.d].day} · {hover.h}:00 — {rows[hover.d].values[hover.h]}% of peak
          </span>
        )}
        <span className="text-[10px] text-ink-faint">Peak activity index</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* BUBBLE MATRIX — the content performance quadrant                            */
/* -------------------------------------------------------------------------- */
export interface BubblePoint {
  id: string
  x: number
  y: number
  z: number
  color: string
  label: string
  platform: string
  meta?: string
}

export function BubbleMatrix({
  points,
  xLabel,
  yLabel,
  zLabel,
  height = 320,
  onSelect,
  selectedId,
  highlightId,
  xFormat = (v: number) => fmtNumber(v),
  yFormat = (v: number) => fmtNumber(v, { compact: true }),
  zFormat = (v: number) => fmtNumber(v, { compact: true }),
  quadrants,
}: {
  points: BubblePoint[]
  xLabel: string
  yLabel: string
  zLabel: string
  height?: number
  onSelect?: (id: string) => void
  selectedId?: string | null
  highlightId?: string | null
  /** Axis value formatters — the raw value decides, not the chart. */
  xFormat?: (v: number) => string
  yFormat?: (v: number) => string
  zFormat?: (v: number) => string
  /** Optional corner captions in TL, TR, BL, BR order. */
  quadrants?: [string, string, string, string]
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const xAvg = points.length ? points.reduce((s, p) => s + p.x, 0) / points.length : 0
  const yAvg = points.length ? points.reduce((s, p) => s + p.y, 0) / points.length : 0
  const active = selectedId ?? highlightId ?? hoverId
  const activePoint = points.find((p) => p.id === active)

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 14, right: 18, bottom: 26, left: -8 }}>
          <CartesianGrid stroke={GRID_STROKE} />
          <XAxis
            type="number"
            dataKey="x"
            {...axisProps}
            tickFormatter={(v: number) => xFormat(v)}
            label={{ value: xLabel, position: 'insideBottom', offset: -16, style: { fill: '#6A7284', fontSize: 10.5, letterSpacing: '0.04em' } }}
          />
          <YAxis
            type="number"
            dataKey="y"
            {...axisProps}
            width={62}
            tickFormatter={(v: number) => fmtNumber(v, { compact: true })}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 22, style: { fill: '#6A7284', fontSize: 10.5, letterSpacing: '0.04em' } }}
          />
          <ZAxis type="number" dataKey="z" range={[26, 720]} />
          <ReferenceLine x={xAvg} stroke="rgba(91,157,255,0.22)" strokeDasharray="3 4" />
          <ReferenceLine y={yAvg} stroke="rgba(91,157,255,0.22)" strokeDasharray="3 4" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.16)' }}
            content={({ active: a, payload }) => {
              if (!a || !payload?.length) return null
              const p = payload[0].payload as BubblePoint
              return (
                <div className="pointer-events-none max-w-[260px] rounded-lg border border-line-3 bg-[#0B0D11]/97 px-3 py-2.5 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.98)] backdrop-blur-xl">
                  <p className="text-[11.5px] font-medium leading-snug text-ink-hi">{p.label}</p>
                  <p className="mono mt-0.5 text-[10px] text-ink-faint">
                    {p.platform} · {p.id}
                  </p>
                  <div className="mt-2 space-y-1">
                    <Row label={xLabel} value={xFormat(p.x)} />
                    <Row label={yLabel} value={yFormat(p.y)} />
                    <Row label={zLabel} value={zFormat(p.z)} />
                  </div>
                  <p className="mt-2 border-t border-line-2 pt-1.5 text-[10px] text-ink-faint">
                    {p.y > yAvg && p.x > xAvg
                      ? 'High reach · high engagement — the reference pattern'
                      : p.y > yAvg
                        ? 'High reach · low engagement — broaden the payoff'
                        : p.x > xAvg
                          ? 'Low reach · high engagement — push distribution'
                          : 'Underperforming on both axes'}
                  </p>
                </div>
              )
            }}
          />
          <Scatter
            data={points}
            isAnimationActive
            animationDuration={700}
            onClick={(d: unknown) => {
              const p = (d as { payload?: BubblePoint })?.payload ?? (d as BubblePoint)
              if (p?.id) onSelect?.(p.id)
            }}
            onMouseEnter={(d: unknown) => {
              const p = (d as { payload?: BubblePoint })?.payload ?? (d as BubblePoint)
              if (p?.id) setHoverId(p.id)
            }}
            onMouseLeave={() => setHoverId(null)}
            style={{ cursor: 'pointer' }}
          >
            {points.map((p) => {
              const isActive = active === p.id
              return (
                <Scatter
                  key={p.id}
                  data={[p]}
                  fill={p.color}
                  shape={(shapeProps: unknown) => {
                    const sp = shapeProps as { cx: number; cy: number; node?: { z?: number } }
                    const r = Math.max(5, Math.sqrt(p.z / Math.PI) / 22) * (isActive ? 1.24 : 1)
                    return (
                      <g>
                        {isActive && <circle cx={sp.cx} cy={sp.cy} r={r + 5} fill="none" stroke={p.color} strokeOpacity={0.4} strokeWidth={1} />}
                        <circle
                          cx={sp.cx}
                          cy={sp.cy}
                          r={r}
                          fill={p.color}
                          fillOpacity={isActive ? 0.62 : 0.34}
                          stroke={p.color}
                          strokeWidth={isActive ? 1.6 : 1}
                        />
                      </g>
                    )
                  }}
                />
              )
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {quadrants && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 p-2" aria-hidden>
          <span className="self-start text-[9.5px] uppercase tracking-[0.07em] text-ink-ghost">{quadrants[0]}</span>
          <span className="justify-self-end self-start text-right text-[9.5px] uppercase tracking-[0.07em] text-ink-ghost">{quadrants[1]}</span>
          <span className="self-end text-[9.5px] uppercase tracking-[0.07em] text-ink-ghost">{quadrants[2]}</span>
          <span className="justify-self-end self-end text-right text-[9.5px] uppercase tracking-[0.07em] text-ink-ghost">{quadrants[3]}</span>
        </div>
      )}
      {activePoint && (
        <div className="pointer-events-none absolute right-2 top-2 max-w-[210px] animate-[fade-in_180ms_var(--ease-cockpit)_both] rounded-lg border border-line-3 bg-[#0B0D11]/94 px-2.5 py-2 backdrop-blur-md">
          <p className="truncate text-[11px] font-medium text-ink-hi">{activePoint.label}</p>
          <p className="mono mt-0.5 text-[9.5px] text-ink-faint">{activePoint.meta}</p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10.5px] text-ink-mid">{label}</span>
      <span className="tnum text-[11px] font-semibold text-ink-hi">{value}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FUNNEL                                                                      */
/* -------------------------------------------------------------------------- */
export function Funnel({
  stages,
  height = 260,
  onStageClick,
}: {
  stages: { id: string; label: string; value: number; color: string; share: number; stepRate: number }[]
  height?: number
  onStageClick?: (id: string) => void
}) {
  const [hover, setHover] = useState<string | null>(null)
  const max = stages[0]?.value || 1
  return (
    <div className="flex flex-col gap-1.5" style={{ minHeight: height }}>
      {stages.map((s, i) => {
        const widthPct = Math.max(8, (s.value / max) * 100)
        const isHover = hover === s.id
        return (
          <button
            key={s.id}
            onMouseEnter={() => setHover(s.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onStageClick?.(s.id)}
            className="group relative flex items-center gap-3 text-left"
            aria-label={`${s.label}: ${fmtNumber(s.value)}`}
          >
            <div className="relative h-11 flex-1">
              <div
                className="absolute left-0 top-0 flex h-full items-center rounded-[6px] px-3 transition-all duration-700 ease-[var(--ease-cockpit)]"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${s.color}30, ${s.color}14)`,
                  border: `1px solid ${s.color}${isHover ? '77' : '3D'}`,
                  boxShadow: isHover ? `0 0 26px -8px ${s.color}` : undefined,
                }}
              >
                <span className="truncate text-[11.5px] font-medium" style={{ color: s.color }}>
                  {s.label}
                </span>
              </div>
              <div className="absolute right-0 top-0 flex h-full items-center gap-3">
                <span className="tnum text-[12.5px] font-semibold text-ink-hi">{fmtNumber(s.value, { compact: true })}</span>
                <span className="mono w-[54px] text-right text-[10px] text-ink-low">{s.share.toFixed(2)}%</span>
              </div>
            </div>
            {i > 0 && (
              <span
                className={cn(
                  'mono absolute -top-[7px] left-0 w-[54px] text-[9.5px] transition-colors',
                  s.stepRate < 25 ? 'text-amber' : 'text-ink-faint',
                )}
              >
                {s.stepRate.toFixed(1)}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* TREEMAP — squarified, no dependency                                          */
/* -------------------------------------------------------------------------- */
interface TreeItem {
  id: string
  label: string
  value: number
  color: string
  sub?: string
}

export function TreemapViz({
  items,
  height = 280,
  onSelect,
  formatter = (v: number) => fmtNumber(v, { compact: true }),
}: {
  items: TreeItem[]
  height?: number
  onSelect?: (id: string) => void
  formatter?: (v: number) => string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const rects = useMemo(() => squarify(items, 1000, height), [items, height])
  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" role="img" aria-label="Treemap of content by metric">
        {rects.map((r) => {
          const isHover = hover === r.item.id
          const showLabel = r.w > 74 && r.h > 34
          return (
            <g
              key={r.item.id}
              onMouseEnter={() => setHover(r.item.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(r.item.id)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <rect
                x={r.x + 1.5}
                y={r.y + 1.5}
                width={Math.max(0, r.w - 3)}
                height={Math.max(0, r.h - 3)}
                rx={5}
                fill={r.item.color}
                fillOpacity={isHover ? 0.42 : 0.2}
                stroke={r.item.color}
                strokeOpacity={isHover ? 0.85 : 0.42}
                strokeWidth={1}
                style={{ transition: 'fill-opacity 200ms, stroke-opacity 200ms' }}
              />
              {showLabel && (
                <>
                  <text x={r.x + 10} y={r.y + 20} fill="#EDF1F8" fontSize={r.w > 150 ? 12 : 10.5} fontWeight={560} style={{ letterSpacing: '-0.01em' }}>
                    {truncate(r.item.label, Math.floor(r.w / 7))}
                  </text>
                  <text x={r.x + 10} y={r.y + 36} fill={r.item.color} fontSize={10.5} fontFamily="var(--font-mono)">
                    {formatter(r.item.value)}
                  </text>
                  {r.h > 62 && r.item.sub && (
                    <text x={r.x + 10} y={r.y + 52} fill="#6A7284" fontSize={9.5}>
                      {truncate(r.item.sub, Math.floor(r.w / 6))}
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function truncate(s: string, n: number) {
  if (n <= 2) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Squarified treemap layout — stable ordering, readable aspect ratios. */
function squarify(items: TreeItem[], width: number, height: number): { item: TreeItem; x: number; y: number; w: number; h: number }[] {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const total = sorted.reduce((s, i) => s + i.value, 0)
  if (!total) return []
  const out: { item: TreeItem; x: number; y: number; w: number; h: number }[] = []
  let x = 0
  let y = 0
  let w = width
  let h = height
  let remaining = total

  let i = 0
  while (i < sorted.length) {
    const horizontal = w >= h
    const side = horizontal ? h : w
    /* Grow a row while the worst aspect ratio keeps improving. */
    let rowSum = 0
    let best = Infinity
    let count = 0
    for (let j = i; j < sorted.length; j++) {
      const nextSum = rowSum + sorted[j].value
      const rowThickness = (nextSum / remaining) * (horizontal ? w : h)
      const worst = worstRatio(sorted.slice(i, j + 1), rowSum + sorted[j].value, rowThickness, side)
      if (worst > best && count > 0) break
      best = worst
      rowSum = nextSum
      count++
    }
    const thickness = (rowSum / remaining) * (horizontal ? w : h)
    let offset = 0
    for (let k = 0; k < count; k++) {
      const item = sorted[i + k]
      const frac = item.value / rowSum
      const extent = side * frac
      if (horizontal) {
        out.push({ item, x: x + thickness, y: y + offset, w: thickness, h: extent })
      } else {
        out.push({ item, x: x + offset, y: y + thickness, w: extent, h: thickness })
      }
      offset += extent
    }
    if (horizontal) {
      x += thickness
      w -= thickness
    } else {
      y += thickness
      h -= thickness
    }
    remaining -= rowSum
    i += count
  }
  return out
}

function worstRatio(row: TreeItem[], rowSum: number, thickness: number, side: number) {
  if (!thickness || !rowSum) return Infinity
  const min = Math.min(...row.map((r) => r.value))
  const max = Math.max(...row.map((r) => r.value))
  const s2 = side * side
  const t2 = thickness * thickness
  const sum2 = rowSum * rowSum
  return Math.max((t2 * max) / sum2, sum2 / (t2 * min) * (s2 / s2))
}

/* -------------------------------------------------------------------------- */
/* RADAR — format comparison across normalised dimensions                      */
/* -------------------------------------------------------------------------- */
export function RadarViz({
  axes,
  series,
  size = 250,
  className,
}: {
  axes: { id: string; label: string }[]
  series: { id: string; label: string; color: string; values: number[] }[]
  size?: number
  className?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 34
  const n = axes.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, v: number) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v] as const

  return (
    <svg width={size} height={size} className={className} role="img" aria-label="Radar comparison across normalised dimensions">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => pt(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.055)"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      })}
      {series.map((s) => {
        const isHover = hover === s.id
        const points = s.values.map((v, i) => pt(i, Math.max(0.04, Math.min(1, v))).join(',')).join(' ')
        return (
          <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
            <polygon points={points} fill={s.color} fillOpacity={isHover ? 0.24 : 0.13} stroke={s.color} strokeWidth={isHover ? 2 : 1.5} strokeLinejoin="round" />
            {s.values.map((v, i) => {
              const [x, y] = pt(i, Math.max(0.04, Math.min(1, v)))
              return <circle key={i} cx={x} cy={y} r={isHover ? 3 : 2} fill={s.color} />
            })}
          </g>
        )
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1.19)
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'
        return (
          <text key={a.id} x={x} y={y + 3} fill="#6A7284" fontSize={9.5} textAnchor={anchor} style={{ letterSpacing: '0.03em' }}>
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* RETENTION BAND                                                              */
/* -------------------------------------------------------------------------- */
export function RetentionBand({
  points,
  height = 200,
  color = '#5B9DFF',
  className,
  markerPct,
}: {
  points: { pct: number; value: number; best: number; worst: number }[]
  height?: number
  color?: string
  className?: string
  markerPct?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  if (!points.length) return null
  const width = 1000
  const maxY = 100
  const px = (pct: number) => (pct / 100) * width
  const py = (v: number) => height - (v / maxY) * height

  const line = (key: 'value' | 'best' | 'worst') => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.pct).toFixed(1)},${py(p[key]).toFixed(1)}`).join(' ')
  const band = `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.pct).toFixed(1)},${py(p.best).toFixed(1)}`).join(' ')} ${points
    .slice()
    .reverse()
    .map((p) => `L${px(p.pct).toFixed(1)},${py(p.worst).toFixed(1)}`)
    .join(' ')} Z`

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Retention curve. Average across content: ${points.map((p) => `${p.pct}%: ${p.value}%`).join(', ')}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          setHover(Math.round(ratio * 100))
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="ret-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={0} y1={py(g)} x2={width} y2={py(g)} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
        ))}
        <path d={band} fill={color} fillOpacity={0.07} />
        <path d={line('best')} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={1} strokeDasharray="4 4" />
        <path d={line('worst')} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={1} strokeDasharray="4 4" />
        <path d={`${line('value')} L${width},${height} L0,${height} Z`} fill="url(#ret-fill)" />
        <path d={line('value')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {markerPct !== undefined && (
          <line x1={px(markerPct)} y1={0} x2={px(markerPct)} y2={height} stroke="rgba(251,191,36,0.5)" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {hover !== null && <line x1={px(hover)} y1={0} x2={px(hover)} y2={height} stroke="rgba(255,255,255,0.28)" strokeWidth={1} />}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-md border border-line-3 bg-[#0B0D11]/97 px-2 py-1 backdrop-blur-md"
          style={{ left: `${hover}%` }}
        >
          <p className="mono text-[10px] text-ink-mid">
            {hover}% watched — {avgAt(points, hover)}% remain
          </p>
        </div>
      )}
    </div>
  )
}

function avgAt(points: { pct: number; value: number }[], pct: number) {
  const nearest = points.reduce((a, b) => (Math.abs(b.pct - pct) < Math.abs(a.pct - pct) ? b : a))
  return nearest.value
}

/* -------------------------------------------------------------------------- */
/* GAUGE — half arc, used for composite scores                                 */
/* -------------------------------------------------------------------------- */
export function Gauge({
  value,
  max = 100,
  size = 120,
  label,
  color,
}: {
  value: number
  max?: number
  size?: number
  label?: string
  color?: string
}) {
  const pct = Math.max(0, Math.min(1, value / max))
  const stroke = 7
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = Math.PI * r
  const tone = color ?? (pct >= 0.7 ? '#34D399' : pct >= 0.4 ? '#FBBF24' : '#FB7185')
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size * 0.64 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute top-0" aria-hidden>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 800ms var(--ease-cockpit)', filter: `drop-shadow(0 0 6px ${tone}66)` }}
        />
      </svg>
      <div className="mt-[26%] text-center">
        <p className="tnum text-[19px] font-semibold leading-none text-ink-hi">{Math.round(value)}</p>
        {label && <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.08em] text-ink-faint">{label}</p>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* WATERFALL — revenue composition                                             */
/* -------------------------------------------------------------------------- */
export function Waterfall({
  rows,
  height = 220,
  currency = (v: number) => fmtMetricValue('revenue', v),
}: {
  rows: { label: string; value: number; color: string; type?: 'total' | 'delta' }[]
  height?: number
  currency?: (v: number) => string
}) {
  let running = 0
  const bars = rows.map((r) => {
    if (r.type === 'total') {
      const bar = { ...r, from: 0, to: r.value }
      running = r.value
      return bar
    }
    const from = running
    running += r.value
    return { ...r, from, to: running }
  })
  const max = Math.max(...bars.map((b) => Math.max(b.from, b.to)), 1)
  const scale = (v: number) => (v / max) * (height - 42)
  const barW = Math.max(18, 100 / bars.length - 3)

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex h-[calc(100%-22px)] items-end gap-[3%]">
        {bars.map((b) => {
          const top = scale(Math.max(b.from, b.to))
          const bottom = scale(Math.min(b.from, b.to))
          return (
            <div key={b.label} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
              <span className="tnum mb-1 text-[10px] font-medium text-ink-mid transition-colors group-hover:text-ink-hi">{currency(b.to)}</span>
              <div className="relative w-full" style={{ height: top, minHeight: 3 }}>
                <div
                  className="absolute inset-x-0 rounded-[3px] transition-all duration-700 ease-[var(--ease-cockpit)]"
                  style={{
                    bottom: 0,
                    height: Math.max(3, top - bottom),
                    background: `linear-gradient(180deg, ${b.color}, ${b.color}55)`,
                    boxShadow: `0 0 16px -6px ${b.color}`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[3%]">
        {bars.map((b) => (
          <span key={b.label} className="flex-1 truncate text-center text-[9.5px] text-ink-faint" title={b.label}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export { fmtDateFull }

/* Keeps the responsive import honest for TS tree-shaking. */
export const _zAxisRef = ZAxis
