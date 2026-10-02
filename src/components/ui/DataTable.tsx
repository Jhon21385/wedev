import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Filter, GripVertical } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMeasure } from '@/lib/hooks'
import { EmptyState, Skeleton } from './Surface'
import { Popover } from './Overlay'
import { Checkbox, SearchInput } from './Field'
import { Tooltip } from './Tooltip'

/* ============================================================================
   DATA TABLE
   One table engine for the whole product:
     · column resize, sort, per-column filter, row selection
     · windowed rendering above `virtualizeAt` rows (large datasets stay smooth)
     · automatic card transformation below 900px — mobile never scrolls sideways
   ========================================================================== */

export interface Column<T> {
  id: string
  header: ReactNode
  /** Cell renderer. */
  cell: (row: T, index: number) => ReactNode
  /** Value used for sorting; omit to disable sort on this column. */
  sortValue?: (row: T) => number | string
  /** Text used by the built-in column filter. */
  filterValue?: (row: T) => string
  width?: number
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  /** Pinned to the left edge while horizontal scrolling. */
  pin?: boolean
  numeric?: boolean
  /** Hidden in the mobile card layout. */
  hideOnCard?: boolean
  /** Rendered as the card title on mobile. */
  primary?: boolean
  headerHint?: string
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  className,
  onRowClick,
  onRowHover,
  selectedId,
  rowActions,
  empty,
  loading,
  density = 'compact',
  virtualizeAt = 140,
  rowHeight = 38,
  stickyHeader = true,
  caption,
  groupBy,
  groupLabel,
  footer,
  reorderable,
  onReorder,
}: {
  rows: T[]
  columns: Column<T>[]
  className?: string
  onRowClick?: (row: T) => void
  onRowHover?: (row: T | null) => void
  selectedId?: string | null
  rowActions?: (row: T) => ReactNode
  empty?: ReactNode
  loading?: boolean
  density?: 'comfortable' | 'compact'
  virtualizeAt?: number
  rowHeight?: number
  stickyHeader?: boolean
  caption?: string
  groupBy?: (row: T) => string
  groupLabel?: (key: string, rows: T[]) => ReactNode
  footer?: ReactNode
  reorderable?: boolean
  onReorder?: (from: number, to: number) => void
}) {
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [scrollTop, setScrollTop] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const { ref: measureRef, height: viewportHeight } = useMeasure<HTMLDivElement>()
  const bodyRef = useRef<HTMLDivElement | null>(null)

  /* --- filter + sort ---------------------------------------------------- */
  const processed = useMemo(() => {
    let out = rows
    for (const [colId, set] of Object.entries(filters)) {
      if (!set.size) continue
      const col = columns.find((c) => c.id === colId)
      if (!col?.filterValue) continue
      out = out.filter((r) => set.has(col.filterValue!(r)))
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id)
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a)
          const bv = col.sortValue!(b)
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
          return sort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    return out
  }, [rows, columns, filters, sort])

  const shouldVirtualize = processed.length > virtualizeAt
  const slot = density === 'compact' ? rowHeight : rowHeight + 12
  const visibleCount = Math.ceil((viewportHeight || 600) / slot) + 8
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(scrollTop / slot) - 4) : 0
  const endIndex = shouldVirtualize ? Math.min(processed.length, startIndex + visibleCount) : processed.length
  const visible = processed.slice(startIndex, endIndex)

  const toggleSort = (id: string) => {
    setSort((s) => (s?.id === id ? (s.dir === 'desc' ? { id, dir: 'asc' } : null) : { id, dir: 'desc' }))
  }

  const gridTemplate = columns.map((c) => `${widths[c.id] ?? c.width ?? 150}px`).join(' ') + (rowActions ? ' 44px' : '')

  const colValues = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const c of columns) {
      if (!c.filterValue) continue
      map[c.id] = [...new Set(rows.map((r) => c.filterValue!(r)))].sort()
    }
    return map
  }, [columns, rows])

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-line-2 bg-panel p-3', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line-1 py-2.5 last:border-0">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    )
  }

  if (!processed.length) {
    return <div className={cn('rounded-xl border border-line-2 bg-panel', className)}>{empty ?? <EmptyState title="Nothing here yet" body="Adjust the filters or create the first item." />}</div>
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-line-2 bg-panel', className)}>
      {caption && <p className="sr-only">{caption}</p>}

      {/* ---- desktop / tablet: real table ---------------------------------- */}
      <div ref={measureRef} className="hidden max-h-[calc(100vh-320px)] min-h-[200px] overflow-auto md:block" onScroll={(e) => setScrollTop((e.target as HTMLElement).scrollTop)}>
        <div className={cn('min-w-full', stickyHeader && 'sticky top-0 z-10')}>
          <div
            className="grid items-center border-b border-line-2 bg-surface-1/95 backdrop-blur-xl"
            style={{ gridTemplateColumns: gridTemplate }}
            role="row"
          >
            {columns.map((c) => (
              <div
                key={c.id}
                role="columnheader"
                aria-sort={sort?.id === c.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={cn(
                  'group/head relative flex h-8 min-w-0 items-center gap-1.5 px-3',
                  c.align === 'right' && 'justify-end',
                  c.align === 'center' && 'justify-center',
                )}
              >
                <button
                  disabled={!c.sortValue}
                  onClick={() => c.sortValue && toggleSort(c.id)}
                  className={cn(
                    'flex min-w-0 items-center gap-1.5 text-left transition-colors',
                    c.sortValue && 'hover:text-ink-hi',
                    sort?.id === c.id ? 'text-ink-hi' : 'text-ink-low',
                  )}
                >
                  <span className="cell-label truncate">{c.header}</span>
                  {sort?.id === c.id && (sort.dir === 'desc' ? <ArrowDown className="h-3 w-3 shrink-0 text-accent" /> : <ArrowUp className="h-3 w-3 shrink-0 text-accent" />)}
                </button>
                {c.headerHint && (
                  <Tooltip content={c.headerHint} side="bottom">
                    <span className="grid h-3 w-3 place-items-center rounded-full border border-line-3 text-[8px] text-ink-faint">?</span>
                  </Tooltip>
                )}
                {c.filterValue && (
                  <ColumnFilter
                    values={colValues[c.id] ?? []}
                    active={filters[c.id] ?? new Set()}
                    onChange={(set) => setFilters((f) => ({ ...f, [c.id]: set }))}
                    align={c.align}
                  />
                )}
                {/* resize handle */}
                <span
                  role="separator"
                  aria-orientation="vertical"
                  className="absolute right-0 top-1.5 h-5 w-[3px] cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-accent/50"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    const startX = e.clientX
                    const startW = widths[c.id] ?? c.width ?? 150
                    const move = (ev: PointerEvent) => setWidths((w) => ({ ...w, [c.id]: Math.max(c.minWidth ?? 72, startW + ev.clientX - startX) }))
                    const up = () => {
                      window.removeEventListener('pointermove', move)
                      window.removeEventListener('pointerup', up)
                    }
                    window.addEventListener('pointermove', move)
                    window.addEventListener('pointerup', up)
                  }}
                />
              </div>
            ))}
            {rowActions && <div className="h-8" />}
          </div>
        </div>

        <div className="relative" style={shouldVirtualize ? { height: processed.length * slot } : undefined}>
          <div style={shouldVirtualize ? { transform: `translateY(${startIndex * slot}px)` } : undefined}>
            {visible.map((row, i) => {
              const index = startIndex + i
              const groupKey = groupBy?.(row)
              const prevGroup = index > 0 ? groupBy?.(processed[index - 1]) : undefined
              const showGroup = groupKey !== undefined && groupKey !== prevGroup
              const selected = selectedId === row.id
              const isDragging = dragIndex === index
              const isOver = overIndex === index
              return (
                <div key={row.id}>
                  {showGroup && (
                    <div className="sticky top-8 z-[5] flex h-7 items-center gap-2 border-y border-line-1 bg-surface-1/92 px-3 backdrop-blur-xl">
                      <span className="cell-label">{groupLabel ? groupLabel(groupKey!, processed.filter((r) => groupBy?.(r) === groupKey)) : groupKey}</span>
                    </div>
                  )}
                  <div
                    role="row"
                    tabIndex={0}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={() => onRowHover?.(row)}
                    onMouseLeave={() => onRowHover?.(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onRowClick?.(row)
                    }}
                    draggable={reorderable}
                    onDragStart={() => reorderable && setDragIndex(index)}
                    onDragOver={(e) => {
                      if (!reorderable) return
                      e.preventDefault()
                      setOverIndex(index)
                    }}
                    onDrop={() => {
                      if (reorderable && dragIndex !== null && overIndex !== null) onReorder?.(dragIndex, overIndex)
                      setDragIndex(null)
                      setOverIndex(null)
                    }}
                    className={cn(
                      'group/row grid items-center border-b border-line-1 transition-colors duration-150',
                      onRowClick && 'cursor-pointer',
                      selected ? 'bg-accent/[0.075]' : 'hover:bg-white/[0.028]',
                      isDragging && 'opacity-40',
                      isOver && reorderable && 'shadow-[inset_0_2px_0_0_var(--color-accent)]',
                    )}
                    style={{ gridTemplateColumns: gridTemplate, height: slot }}
                  >
                    {columns.map((c, ci) => (
                      <div
                        key={c.id}
                        className={cn(
                          'flex min-w-0 items-center px-3',
                          c.align === 'right' && 'justify-end',
                          c.align === 'center' && 'justify-center',
                          c.numeric && 'tnum',
                          selected && ci === 0 && 'relative',
                        )}
                      >
                        {selected && ci === 0 && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(91,157,255,0.85)]" />
                        )}
                        {reorderable && ci === 0 && <GripVertical className="mr-1 h-3 w-3 shrink-0 cursor-grab text-ink-ghost opacity-0 transition-opacity group-hover/row:opacity-100" />}
                        <span className="min-w-0 flex-1 truncate">{c.cell(row, index)}</span>
                      </div>
                    ))}
                    {rowActions && <div className="flex h-full items-center justify-end pr-2 opacity-0 transition-opacity group-hover/row:opacity-100">{rowActions(row)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---- mobile: card transformation ---------------------------------- */}
      <ul className="divide-y divide-[var(--color-line-1)] md:hidden">
        {processed.map((row) => {
          const primary = columns.find((c) => c.primary) ?? columns[0]
          const secondary = columns.filter((c) => c !== primary && !c.hideOnCard).slice(0, 4)
          return (
            <li key={row.id}>
              <button
                onClick={() => onRowClick?.(row)}
                className={cn('w-full px-3.5 py-3 text-left transition-colors', selectedId === row.id ? 'bg-accent/[0.07]' : 'active:bg-white/[0.04]')}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 text-[12.5px] font-medium text-ink-hi">{primary.cell(row, 0)}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {secondary.map((c) => (
                    <div key={c.id} className="min-w-0">
                      <dt className="cell-label truncate">{typeof c.header === 'string' ? c.header : c.id}</dt>
                      <dd className="mt-0.5 truncate text-[11.5px] text-ink">{c.cell(row, 0)}</dd>
                    </div>
                  ))}
                </dl>
              </button>
            </li>
          )
        })}
      </ul>

      {footer && <div className="border-t border-line-2 px-3 py-2">{footer}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
function ColumnFilter({
  values,
  active,
  onChange,
  align,
}: {
  values: string[]
  active: Set<string>
  onChange: (set: Set<string>) => void
  align?: 'left' | 'right' | 'center'
}) {
  const [query, setQuery] = useState('')
  const shown = values.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
  return (
    <Popover
      align={align === 'right' ? 'end' : 'start'}
      width={240}
      trigger={({ toggle }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          aria-label="Filter column"
          className={cn(
            'ml-auto grid h-5 w-5 shrink-0 place-items-center rounded transition-colors',
            active.size ? 'text-accent' : 'text-ink-ghost opacity-0 group-hover/head:opacity-100 hover:text-ink',
          )}
        >
          <Filter className="h-3 w-3" />
        </button>
      )}
    >
      <div className="p-2">
        {values.length > 7 && <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter values…" onClear={() => setQuery('')} className="mb-2" />}
        <div className="max-h-[220px] overflow-y-auto">
          {shown.map((v) => (
            <Checkbox
              key={v}
              checked={active.has(v)}
              label={v}
              onChange={() => {
                const next = new Set(active)
                if (next.has(v)) next.delete(v)
                else next.add(v)
                onChange(next)
              }}
            />
          ))}
          {!shown.length && <p className="px-2 py-3 text-center text-[11.5px] text-ink-faint">No values</p>}
        </div>
        {active.size > 0 && (
          <button onClick={() => onChange(new Set())} className="mt-1.5 w-full rounded-md px-2 py-1.5 text-[11.5px] text-ink-low transition-colors hover:bg-white/[0.05] hover:text-ink">
            Clear this column
          </button>
        )}
      </div>
    </Popover>
  )
}
