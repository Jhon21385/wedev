import { useState } from 'react'
import { CalendarRange, Filter, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { isContentScoped, scopeContent, type FilterState } from '@/analytics/queries'
import { PERIOD_PRESETS, resolvePeriod } from '@/analytics/periods'
import { fmtDateFull } from '@/lib/format'
import { Button, IconButton } from '@/components/ui/Button'
import { Combobox, Input, Segmented } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Surface'
import { Popover } from '@/components/ui/Overlay'

/* ============================================================================
   GLOBAL FILTER BAR
   The single control surface for analytics scope. Date and platform filter the
   metric stream; taxonomy filters narrow the content graph — and the whole
   product reacts identically because every screen reads the same state.
   ========================================================================== */

export function FilterBar({
  className,
  showCustomRange = false,
  compact,
}: {
  className?: string
  showCustomRange?: boolean
  compact?: boolean
}) {
  const ds = useDataset()
  const filters = useApp((s) => s.filters)
  const setPeriod = useApp((s) => s.setPeriod)
  const togglePlatform = useApp((s) => s.togglePlatform)
  const toggleFilterValue = useApp((s) => s.toggleFilterValue)
  const setFilterList = useApp((s) => s.setFilterList)
  const clearFilters = useApp((s) => s.clearFilters)

  const period = resolvePeriod(filters.period, filters.customFrom, filters.customTo)
  const scopedCount = isContentScoped(filters) ? scopeContent(ds, filters, period).length : null

  const activeChips = buildChips(ds, filters, (key, value) =>
    key === 'platforms' ? togglePlatform(value as never) : toggleFilterValue(key as never, value),
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Time period"
          size={compact ? 'xs' : 'sm'}
          value={filters.period}
          onChange={(p) => setPeriod(p)}
          options={PERIOD_PRESETS.map((p) => ({ id: p.id, label: p.label, title: p.title }))}
        />

        {showCustomRange && filters.period === 'custom' && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.customFrom ?? period.from}
              max={filters.customTo ?? period.to}
              onChange={(e) => setPeriod('custom', e.target.value, filters.customTo ?? period.to)}
              className="h-7.5 w-[132px] text-[11.5px]"
            />
            <span className="text-ink-ghost">→</span>
            <Input
              type="date"
              value={filters.customTo ?? period.to}
              min={filters.customFrom ?? period.from}
              onChange={(e) => setPeriod('custom', filters.customFrom ?? period.from, e.target.value)}
              className="h-7.5 w-[132px] text-[11.5px]"
            />
          </div>
        )}

        <div className="mx-0.5 h-4 w-px bg-line-2" aria-hidden />

        {/* Platform toggles — the fast path, always visible */}
        <div className="flex items-center gap-1" role="group" aria-label="Platform filter">
          {ds.platforms
            .filter((p) => p.status === 'live')
            .map((p) => {
              const on = filters.platforms.includes(p.id)
              const noneSelected = filters.platforms.length === 0
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  aria-pressed={on}
                  title={`${p.name} — ${on ? 'filtered in' : noneSelected ? 'all platforms' : 'click to include'}`}
                  className={cn(
                    'inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium transition-all duration-200',
                    on
                      ? 'border-transparent text-ink-hi'
                      : 'border-line-2 text-ink-low hover:border-line-3 hover:text-ink-mid',
                  )}
                  style={on ? { background: `${p.color}1F`, borderColor: `${p.color}55`, boxShadow: `0 0 16px -8px ${p.color}` } : undefined}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full transition-all"
                    style={{ background: p.color, opacity: on || noneSelected ? 1 : 0.35, boxShadow: on ? `0 0 6px ${p.color}` : undefined }}
                  />
                  {p.short}
                </button>
              )
            })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mono hidden text-[10.5px] text-ink-faint md:inline">
            {fmtDateFull(period.from)} — {fmtDateFull(period.to)}
          </span>
          <AdvancedFilters />
        </div>
      </div>

      {(activeChips.length > 0 || scopedCount !== null) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal className="h-3 w-3 shrink-0 text-ink-faint" />
          {scopedCount !== null && (
            <Badge tone="accent" size="xs" mono>
              {scopedCount} in scope
            </Badge>
          )}
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="group inline-flex h-6 items-center gap-1.5 rounded-md border border-line-2 bg-white/[0.04] px-1.5 text-[10.5px] text-ink-mid transition-colors hover:border-line-3 hover:text-ink-hi"
            >
              <span className="text-ink-faint">{chip.group}</span>
              <span className="text-ink-hi">{chip.label}</span>
              <X className="h-3 w-3 text-ink-faint transition-colors group-hover:text-rose" />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button onClick={clearFilters} className="ml-1 inline-flex items-center gap-1 text-[10.5px] text-ink-low transition-colors hover:text-ink">
              <RotateCcw className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
function AdvancedFilters() {
  const ds = useDataset()
  const filters = useApp((s) => s.filters)
  const setFilterList = useApp((s) => s.setFilterList)
  const clearFilters = useApp((s) => s.clearFilters)
  const [rangeOpen, setRangeOpen] = useState(false)
  const count =
    filters.typeIds.length + filters.topicIds.length + filters.seriesIds.length + filters.campaignIds.length + filters.statuses.length

  return (
    <Popover
      align="end"
      width={320}
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={cn(
            'inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-medium transition-all duration-200',
            count > 0
              ? 'border-accent/35 bg-accent/[0.1] text-accent-ink'
              : 'border-line-2 text-ink-mid hover:border-line-3 hover:bg-white/[0.04] hover:text-ink-hi',
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {count > 0 && <span className="mono rounded bg-accent/25 px-1 text-[10px]">{count}</span>}
        </button>
      )}
    >
      <div className="max-h-[70vh] overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-semibold text-ink-hi">Analytics scope</p>
            <p className="mt-0.5 text-[11px] text-ink-low">Taxonomy filters narrow the content graph, not just the table.</p>
          </div>
          {count > 0 && (
            <button onClick={clearFilters} className="shrink-0 text-[11px] text-ink-low transition-colors hover:text-ink">
              Reset
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          <FilterField label="Content type">
            <Combobox
              multiple
              options={[...ds.contentTypes].map((t) => ({ value: t.id, label: t.name, color: t.color, hint: t.custom ? 'custom' : undefined }))}
              value={filters.typeIds}
              onChange={(v) => setFilterList('typeIds', v)}
              placeholder="All content types"
            />
          </FilterField>

          <FilterField label="Topic">
            <Combobox
              multiple
              options={ds.topics.map((t) => ({ value: t.id, label: t.name, color: t.color, group: t.parentId ? 'Topics' : 'Pillars' }))}
              value={filters.topicIds}
              onChange={(v) => setFilterList('topicIds', v)}
              placeholder="All topics"
            />
          </FilterField>

          <FilterField label="Series">
            <Combobox
              multiple
              options={ds.series.map((s) => ({ value: s.id, label: s.name, color: s.color, hint: s.cadence }))}
              value={filters.seriesIds}
              onChange={(v) => setFilterList('seriesIds', v)}
              placeholder="All series"
            />
          </FilterField>

          <FilterField label="Campaign">
            <Combobox
              multiple
              options={ds.campaigns.map((c) => ({ value: c.id, label: c.name, color: c.color, hint: c.status }))}
              value={filters.campaignIds}
              onChange={(v) => setFilterList('campaignIds', v)}
              placeholder="All campaigns"
            />
          </FilterField>

          <FilterField label="Content status">
            <Combobox
              multiple
              options={ds.statuses.map((s) => ({ value: s.id, label: s.name, color: s.accent }))}
              value={filters.statuses}
              onChange={(v) => setFilterList('statuses', v)}
              placeholder="All statuses"
            />
          </FilterField>
        </div>

        <div className="mt-3 border-t border-line-2 pt-3">
          <button
            onClick={() => setRangeOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[11.5px] text-ink-mid transition-colors hover:text-ink-hi"
          >
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" /> Custom date range
            </span>
            <span className="text-ink-faint">{rangeOpen ? '−' : '+'}</span>
          </button>
          {rangeOpen && <CustomRange />}
        </div>
      </div>
    </Popover>
  )
}

function CustomRange() {
  const filters = useApp((s) => s.filters)
  const setPeriod = useApp((s) => s.setPeriod)
  const period = resolvePeriod(filters.period, filters.customFrom, filters.customTo)
  return (
    <div className="mt-2.5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="cell-label block">From</span>
          <Input type="date" value={filters.customFrom ?? period.from} onChange={(e) => setPeriod('custom', e.target.value, filters.customTo ?? period.to)} />
        </label>
        <label className="space-y-1">
          <span className="cell-label block">To</span>
          <Input type="date" value={filters.customTo ?? period.to} onChange={(e) => setPeriod('custom', filters.customFrom ?? period.from, e.target.value)} />
        </label>
      </div>
      <div className="flex gap-1.5">
        {[
          { label: '30d', days: 30 },
          { label: '90d', days: 90 },
          { label: '180d', days: 180 },
        ].map((p) => (
          <Button
            key={p.label}
            size="xs"
            variant="ghost"
            onClick={() => {
              const to = new Date()
              const from = new Date()
              from.setDate(from.getDate() - (p.days - 1))
              const iso = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
              setPeriod('custom', iso(from), iso(to))
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="cell-label mb-1 block">{label}</span>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
function buildChips(
  ds: ReturnType<typeof useDataset>,
  filters: FilterState,
  remove: (key: string, value: string) => void,
): { key: string; group: string; label: string; onRemove: () => void }[] {
  const chips: { key: string; group: string; label: string; onRemove: () => void }[] = []
  filters.platforms.forEach((p) => {
    const def = ds.platforms.find((x) => x.id === p)
    chips.push({ key: `plat-${p}`, group: 'Platform', label: def?.name ?? p, onRemove: () => remove('platforms', p) })
  })
  filters.typeIds.forEach((t) => {
    const def = ds.contentTypes.find((x) => x.id === t)
    chips.push({ key: `type-${t}`, group: 'Type', label: def?.name ?? t, onRemove: () => remove('typeIds', t) })
  })
  filters.topicIds.forEach((t) => {
    const def = ds.topics.find((x) => x.id === t)
    chips.push({ key: `topic-${t}`, group: 'Topic', label: def?.name ?? t, onRemove: () => remove('topicIds', t) })
  })
  filters.seriesIds.forEach((t) => {
    const def = ds.series.find((x) => x.id === t)
    chips.push({ key: `series-${t}`, group: 'Series', label: def?.name ?? t, onRemove: () => remove('seriesIds', t) })
  })
  filters.campaignIds.forEach((t) => {
    const def = ds.campaigns.find((x) => x.id === t)
    chips.push({ key: `camp-${t}`, group: 'Campaign', label: def?.name ?? t, onRemove: () => remove('campaignIds', t) })
  })
  filters.statuses.forEach((t) => {
    const def = ds.statuses.find((x) => x.id === t)
    chips.push({ key: `status-${t}`, group: 'Status', label: def?.name ?? t, onRemove: () => remove('statuses', t) })
  })
  return chips
}
