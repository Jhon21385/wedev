import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  FileText,
  Handshake,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { fmtCurrency, fmtDate, fmtNumber, fmtRelativeFuture, relativeDays } from '@/lib/format'
import { dealStats, revenueBySource, revenueTimeline, scopedTotals } from '@/analytics/queries'
import type { BrandDeal } from '@/data/types'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton, StatusPill } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { CheckRow, DescriptionList, Inset, StickyActions } from '@/components/ui/blocks'
import { Segmented, SearchInput } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { FilterBar } from '@/components/shell/FilterBar'
import { MetricBars, RankedBars, ShareBar } from '@/components/charts/Bars'
import { Waterfall } from '@/components/charts/Special'
import { ChartPanel, chartData } from '@/components/charts/kit'
import { MetricCard } from '@/components/metrics/MetricCard'
import { DataTable, type Column } from '@/components/ui/DataTable'

/* ============================================================================
   REVENUE
   A creator business, not a dashboard widget: sources, deals, invoices and
   expenses, reconciled against the same period scope as everything else.
   ========================================================================== */

const DEAL_STATUS_META: Record<BrandDeal['status'], { label: string; tone: 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'violet' | 'cyan' | 'outline' }> = {
  prospect: { label: 'Prospect', tone: 'outline' },
  negotiating: { label: 'Negotiating', tone: 'warn' },
  signed: { label: 'Signed', tone: 'accent' },
  'in-production': { label: 'In production', tone: 'violet' },
  delivered: { label: 'Delivered', tone: 'cyan' },
  paid: { label: 'Paid', tone: 'success' },
  lost: { label: 'Lost', tone: 'danger' },
}

export function RevenuePage() {
  const ds = useDataset()
  const settled = useSettled(200)
  const pushToast = useApp((s) => s.pushToast)
  const [dealId, setDealId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'deals' | 'invoices' | 'expenses'>('deals')

  const totals = useMemo(() => scopedTotals(ds, useApp.getState().filters), [ds])
  const sources = useMemo(() => revenueBySource(ds, useApp.getState().filters), [ds])
  const timeline = useMemo(() => revenueTimeline(ds, 12), [ds])
  const deals = useMemo(() => dealStats(ds), [ds])

  /* Series behind the business charts. */
  const waterfallData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Line' },
          { key: 'value', label: 'Amount', align: 'right', format: (v: number) => fmtCurrency(v) },
        ],
        [
          ...timeline.slice(-6).map((m) => ({ label: m.label, value: Math.round(m.total) })),
          { label: 'Expenses', value: -Math.round(timeline.slice(-6).reduce((s, m) => s + m.expenses, 0)) },
          { label: 'Net', value: Math.round(timeline.slice(-6).reduce((s, m) => s + m.net, 0)) },
        ],
        { unit: 'month', caption: 'Monthly revenue, expenses and net for the last six months' },
      ),
    [timeline],
  )

  const sourceData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Source' },
          { key: 'amount', label: 'Amount', align: 'right', format: (v: number) => fmtCurrency(v) },
          { key: 'category', label: 'Category' },
        ],
        sources.map((x) => ({ name: x.name, amount: Math.round(x.amount), category: x.category })),
        { unit: 'source', caption: 'Revenue by source with concentration risk' },
      ),
    [sources],
  )

  const expensesInScope = useMemo(() => {
    const from = timeline[Math.max(0, timeline.length - 6)]?.month ?? '0000-00'
    return ds.expenses.filter((e) => e.date.slice(0, 7) >= from)
  }, [ds.expenses, timeline])

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>()
    expensesInScope.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
    const palette: Record<string, string> = {
      Software: '#5B9DFF',
      Team: '#A78BFA',
      Equipment: '#38D6F5',
      Marketing: '#FBBF24',
      Admin: '#6A7284',
      Education: '#34D399',
      Travel: '#FB7185',
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value, color: palette[label] ?? '#6A7284' }))
      .sort((a, b) => b.value - a.value)
  }, [expensesInScope])

  const expenseData = useMemo(
    () =>
      chartData(
        [
          { key: 'label', label: 'Category' },
          { key: 'value', label: 'Spend', align: 'right', format: (v: number) => fmtCurrency(v) },
        ],
        expensesByCategory.map((c) => ({ label: c.label, value: Math.round(c.value) })),
        { unit: 'category', caption: 'Expenses by category over the last six months' },
      ),
    [expensesByCategory],
  )

  const openDeal = ds.deals.find((d) => d.id === dealId) ?? null
  const totalExpenses = expensesInScope.reduce((s, e) => s + e.amount, 0)
  const net = totals.totals.revenue - totalExpenses
  const topThreeShare = sources.slice(0, 3).reduce((s, x) => s + x.amount, 0) / (sources.reduce((s, x) => s + x.amount, 0) || 1)

  if (!settled) {
    return (
      <Page width="wide">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-[420px]" />
        <Skeleton className="mt-5 h-[460px] rounded-xl" />
      </Page>
    )
  }

  const dealColumns: Column<BrandDeal>[] = [
    { id: 'brand', header: 'Brand / campaign', primary: true, width: 260, sortValue: (d) => d.brand, filterValue: (d) => `${d.brand} ${d.campaign}`, cell: (d) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${d.color}44`, background: `${d.color}16` }}>
          <Building2 className="h-3.5 w-3.5" style={{ color: d.color }} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] text-ink-hi">{d.brand}</span>
          <span className="block truncate text-[10.5px] text-ink-faint">{d.campaign}</span>
        </span>
      </span>
    ) },
    { id: 'status', header: 'Stage', width: 122, sortValue: (d) => d.status, filterValue: (d) => DEAL_STATUS_META[d.status].label, cell: (d) => <Badge tone={DEAL_STATUS_META[d.status].tone} size="xs">{DEAL_STATUS_META[d.status].label}</Badge> },
    { id: 'deliverables', header: 'Deliverables', width: 128, sortValue: (d) => d.deliverables.filter((x) => x.done).length / d.deliverables.length, cell: (d) => {
      const done = d.deliverables.filter((x) => x.done).length
      return (
        <span className="flex items-center gap-2">
          <Progress value={done} max={d.deliverables.length} size="xs" color={done === d.deliverables.length ? '#34D399' : 'var(--color-accent)'} />
          <span className="mono shrink-0 text-[10px] text-ink-faint">{done}/{d.deliverables.length}</span>
        </span>
      )
    } },
    { id: 'deadline', header: 'Deadline', width: 108, sortValue: (d) => d.deadline, cell: (d) => {
      const days = relativeDays(d.deadline)
      const late = days !== null && days < 0 && d.status !== 'paid'
      return <span className={cn('mono text-[10.5px]', late ? 'text-rose' : days !== null && days <= 7 ? 'text-amber' : 'text-ink-low')}>{fmtRelativeFuture(d.deadline)}</span>
    } },
    { id: 'payment', header: 'Payment', width: 110, sortValue: (d) => d.paymentStatus, filterValue: (d) => d.paymentStatus, cell: (d) => (
      <Badge tone={d.paymentStatus === 'paid' ? 'success' : d.paymentStatus === 'overdue' ? 'danger' : d.paymentStatus === 'deposit' ? 'cyan' : 'outline'} size="xs">
        {d.paymentStatus}
      </Badge>
    ) },
    { id: 'fee', header: 'Fee', width: 104, align: 'right', numeric: true, sortValue: (d) => d.fee, cell: (d) => <span className="text-ink-hi">{fmtCurrency(d.fee)}</span> },
    { id: 'actions', header: '', width: 44, cell: (d) => <IconButton label="Open deal" icon={<ArrowUpRight />} size="xs" onClick={(e) => { e.stopPropagation(); setDealId(d.id) }} /> },
  ]

  const filteredDeals = query.trim()
    ? ds.deals.filter((d) => `${d.brand} ${d.campaign}`.toLowerCase().includes(query.trim().toLowerCase()))
    : ds.deals

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Business"
        title="Revenue"
        description="Where the money comes from, what it costs to earn, and which invoices are quietly overdue."
        meta={<FilterBar />}
        actions={
          <>
            <Button variant="secondary" size="md" icon={<Receipt />} onClick={() => pushToast({ kind: 'info', title: 'Invoice draft created', body: 'Prefilled from the newest signed deal.' })}>
              New invoice
            </Button>
            <Button variant="primary" size="md" icon={<Plus />} onClick={() => pushToast({ kind: 'info', title: 'New deal', body: 'Add a brand, a fee and a deadline — the pipeline updates instantly.' })}>
              Add deal
            </Button>
          </>
        }
      />

      <div className="mb-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard metricId="revenue" value={totals.totals.revenue} size="lg" context={`in the selected scope · ${sources.length} active sources`} />
        <MetricCard metricId="revenue" value={net} size="lg" color={net >= 0 ? '#34D399' : '#FB7185'} context={`net after ${fmtCurrency(totalExpenses)} expenses`} />
        <Panel className="p-4">
          <p className="cell-label">Outstanding</p>
          <p className="tnum mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] text-ink-hi">{fmtCurrency(deals.outstanding)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            <Handshake className="h-3 w-3" /> {deals.openCount} open deals · {fmtCurrency(deals.pipelineValue)} pipeline
          </p>
        </Panel>
        <Panel className={cn('p-4', deals.overdueInvoices.length > 0 && 'border-rose/30')}>
          <p className="cell-label">Overdue</p>
          <p className={cn('tnum mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em]', deals.overdueInvoices.length ? 'text-rose' : 'text-ink-hi')}>
            {fmtCurrency(deals.overdueInvoices.reduce((s, i) => s + i.amount, 0))}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            {deals.overdueInvoices.length ? (
              <>
                <AlertTriangle className="h-3 w-3 text-rose" /> {deals.overdueInvoices.length} invoice{deals.overdueInvoices.length > 1 ? 's' : ''} past due
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald" /> everything on schedule
              </>
            )}
          </p>
        </Panel>
      </div>

      <SplitGrid ratio="wide" className="mb-3.5">
        <Panel>
          <PanelHeader
            icon={<TrendingUp />}
            title="Revenue by month"
            subtitle="Six months of income, then the expense line, then net — the only three numbers that describe the business"
          />
          <div className="p-4">
            <ChartPanel bare data={waterfallData}>
              <Waterfall
                height={280}
                rows={[
                  ...timeline.slice(-6).map((m, i) => ({
                    label: m.label,
                    value: m.total,
                    color: ['#5B9DFF', '#38D6F5', '#A78BFA', '#34D399', '#FBBF24', '#2DD4BF'][i % 6],
                  })),
                  { label: 'Expenses', value: -timeline.slice(-6).reduce((s, m) => s + m.expenses, 0), color: '#FB7185' },
                  { label: 'Net', value: timeline.slice(-6).reduce((s, m) => s + m.net, 0), color: '#34D399', type: 'total' as const },
                ]}
              />
            </ChartPanel>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <PanelHeader dense icon={<Wallet />} title="Sources" subtitle="Concentration is the risk — top three share" />
            <div className="p-3.5">
              <div className="mb-3 flex items-baseline gap-2">
                <span className={cn('tnum text-[22px] font-semibold', topThreeShare > 0.8 ? 'text-amber' : 'text-ink-hi')}>{(topThreeShare * 100).toFixed(0)}%</span>
                <span className="text-[11px] text-ink-faint">from {Math.min(3, sources.length)} sources</span>
              </div>
              <ChartPanel bare data={sourceData}>
                <ShareBar segments={sources.map((s) => ({ id: s.id, label: s.name, value: s.amount, color: s.color }))} showLabels />
              </ChartPanel>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Wallet />} title="Top sources" subtitle="Click to filter the whole page" />
            <div className="p-3.5">
              <ChartPanel bare data={{ ...sourceData, rows: sourceData.rows.slice(0, 6) }}>
                <RankedBars
                  height={220}
                  metricId="revenue"
                  rows={sources.slice(0, 6).map((s) => ({ id: s.id, label: s.name, value: s.amount, color: s.color, sub: s.category }))}
                  onSelect={(id) => {
                    const src = sources.find((s) => s.id === id)
                    if (src) pushToast({ kind: 'info', title: `${src.name} selected`, body: `${fmtCurrency(src.amount)} in the current scope.` })
                  }}
                />
              </ChartPanel>
            </div>
          </Panel>
        </div>
      </SplitGrid>

      <Panel>
        <PanelHeader
          icon={<BadgeDollarSign />}
          title="Business ledger"
          subtitle="Deals, invoices and expenses — one click between them"
          actions={
            <>
              <Segmented
                size="sm"
                ariaLabel="Ledger view"
                value={tab}
                onChange={setTab}
                options={[
                  { id: 'deals', label: `Deals ${ds.deals.length}` },
                  { id: 'invoices', label: `Invoices ${ds.invoices.length}` },
                  { id: 'expenses', label: `Expenses ${expensesInScope.length}` },
                ]}
              />
              {tab === 'deals' && (
                <div className="w-[190px]">
                  <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a brand…" onClear={() => setQuery('')} />
                </div>
              )}
            </>
          }
        />

        {tab === 'deals' && (
          <DataTable
            rows={filteredDeals}
            columns={dealColumns}
            rowHeight={52}
            onRowClick={(d) => setDealId(d.id)}
            empty={<EmptyState compact icon={<Handshake />} title="No deals match" body="Clear the search to see the full pipeline." />}
            footer={
              <span className="mono text-[10.5px] text-ink-faint">
                {fmtCurrency(filteredDeals.reduce((s, d) => s + d.fee, 0))} contracted · win rate {deals.winRate}% · avg deal {fmtCurrency(deals.avgDeal)}
              </span>
            }
          />
        )}

        {tab === 'invoices' && (
          <ul className="divide-y divide-[var(--color-line-1)]">
            {ds.invoices.map((inv) => (
              <li key={inv.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', inv.status === 'overdue' && 'bg-rose/[0.035]')}>
                <span className="mono w-[124px] shrink-0 text-[11px] text-ink-mid">{inv.number}</span>
                <span className="min-w-[140px] flex-1 truncate text-[12px] text-ink-hi">{inv.brand}</span>
                <span className="mono hidden w-[110px] shrink-0 text-[10.5px] text-ink-faint sm:block">issued {fmtDate(inv.issued, 'short')}</span>
                <span className={cn('mono w-[110px] shrink-0 text-[10.5px]', inv.status === 'overdue' ? 'text-rose' : 'text-ink-faint')}>due {fmtDate(inv.due, 'short')}</span>
                <span className="tnum w-[90px] shrink-0 text-right text-[12px] text-ink-hi">{fmtCurrency(inv.amount)}</span>
                <Badge tone={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'sent' ? 'accent' : 'outline'} size="xs">
                  {inv.status}
                </Badge>
                {inv.status === 'overdue' && (
                  <Button size="xs" variant="danger" onClick={() => pushToast({ kind: 'info', title: 'Reminder sent', body: `A polite nudge went to ${inv.brand}.` })}>
                    Chase
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === 'expenses' && (
          <SplitGrid ratio="wide" className="p-4">
            <ul className="divide-y divide-[var(--color-line-1)] rounded-xl border border-line-2">
              {[...expensesInScope].sort((a, b) => b.amount - a.amount).slice(0, 12).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] text-ink">{e.description}</span>
                    <span className="mono block text-[9.5px] text-ink-faint">
                      {e.category} · {e.date.slice(0, 7)}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[11.5px] text-ink-hi">{fmtCurrency(e.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-3.5">
              <Panel>
                <PanelHeader dense icon={<Wallet />} title="By category" subtitle="Last six months" />
                <div className="p-3.5">
                  <ChartPanel bare data={expenseData}>
                    <ShareBar segments={expensesByCategory.map((c) => ({ id: c.label, label: c.label, value: c.value, color: c.color }))} showLabels />
                  </ChartPanel>
                  <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-line-1 pt-3.5">
                    <KeyValue label="Total expenses" value={fmtCurrency(totalExpenses)} mono />
                    <KeyValue label="Monthly average" value={fmtCurrency(totalExpenses / 6)} mono />
                    <KeyValue label="Biggest category" value={expensesByCategory[0]?.label ?? '—'} hint={fmtCurrency(expensesByCategory[0]?.value ?? 0)} />
                    <KeyValue label="Margin" value={`${(((totals.totals.revenue - totalExpenses) / (totals.totals.revenue || 1)) * 100).toFixed(0)}%`} hint="net / gross" />
                  </div>
                </div>
              </Panel>
              <Panel>
                <PanelHeader dense icon={<TrendingUp />} title="Fixed vs variable" subtitle="What you owe even in a quiet month" />
                <div className="p-3.5">
                  <ChartPanel bare data={expenseData}>
                    <MetricBars
                      height={160}
                      rows={expensesByCategory.map((c) => ({
                        label: c.label,
                        value: c.value,
                        amount: c.value,
                        views: 0,
                        reach: 0,
                        engagements: 0,
                        likes: 0,
                        comments: 0,
                        shares: 0,
                        saves: 0,
                        watchMinutes: 0,
                        followersGained: 0,
                        clicks: 0,
                        revenue: c.value,
                        impressions: 0,
                        engagementRate: 0,
                        followers: 0,
                        date: c.label,
                      }))}
                      series={[{ id: 'revenue', key: 'revenue', label: 'Spend', color: '#A78BFA', metricId: 'revenue' }]}
                    />
                  </ChartPanel>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
                    Team and software are fixed. Equipment and travel scale with output — the first place to flex in a low month.
                  </p>
                </div>
              </Panel>
            </div>
          </SplitGrid>
        )}
      </Panel>

      <DealDrawer deal={openDeal} onClose={() => setDealId(null)} />
    </Page>
  )
}

function DealDrawer({ deal, onClose }: { deal: BrandDeal | null; onClose: () => void }) {
  const ds = useDataset()
  const pushToast = useApp((s) => s.pushToast)

  return (
    <Drawer open={!!deal} onClose={onClose} width={480} title={deal ? 'Brand deal' : undefined}>
      {deal && (
        <div className="scroll-fade-y h-full overflow-y-auto p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border" style={{ borderColor: `${deal.color}55`, background: `${deal.color}16` }}>
              <Building2 className="h-5 w-5" style={{ color: deal.color }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink-hi">{deal.brand}</p>
              <p className="text-[11.5px] text-ink-low">{deal.campaign}</p>
            </div>
            <Badge tone={DEAL_STATUS_META[deal.status].tone} size="sm">
              {DEAL_STATUS_META[deal.status].label}
            </Badge>
          </div>

          <DescriptionList divider>
            <KeyValue label="Fee" value={fmtCurrency(deal.fee)} mono />
            <KeyValue label="Payment" value={deal.paymentStatus} />
            <KeyValue label="Deadline" value={fmtDate(deal.deadline, 'long')} hint={fmtRelativeFuture(deal.deadline)} mono />
            <KeyValue label="Industry" value={deal.industry} />
            <KeyValue label="Contact" value={deal.contact} />
            <KeyValue label="Deliverables" value={`${deal.deliverables.filter((d) => d.done).length} / ${deal.deliverables.length}`} />
          </DescriptionList>

          <div className="mt-4">
            <p className="cell-label mb-2">Deliverables</p>
            <ul className="space-y-1">
              {deal.deliverables.map((d) => {
                const days = relativeDays(d.due)
                return (
                  <li key={d.id}>
                    <CheckRow done={d.done} label={d.label} meta={fmtDate(d.due, 'short')} metaTone={!d.done && days !== null && days < 0 ? 'warn' : 'muted'} />
                  </li>
                )
              })}
            </ul>
          </div>

          {deal.performance && deal.performance.contentIds.length > 0 && (
            <div className="mt-4">
              <p className="cell-label mb-2">Delivered content</p>
              <ul className="space-y-1">
                {deal.performance.contentIds.map((cid) => {
                  const c = ds.content.find((x) => x.id === cid)
                  if (!c) return null
                  return (
                    <li key={cid}>
                      <button className="flex w-full items-center gap-2.5 rounded-lg border border-line-2 px-2.5 py-2 text-left transition-colors hover:border-line-3">
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{c.title}</span>
                        <StatusPill name={c.status} color="#5B9DFF" className="text-[9.5px]" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-2.5 grid grid-cols-3 gap-3">
                <KeyValue label="Deal reach" value={fmtNumber(deal.performance.reach, { compact: true })} mono />
                <KeyValue label="Engagements" value={fmtNumber(deal.performance.engagements, { compact: true })} mono />
                <KeyValue label="CPM" value={fmtCurrency(deal.performance.cpm)} mono />
              </div>
            </div>
          )}

          <Inset className="mt-4">
            <p className="cell-label mb-1.5">Notes</p>
            <p className="text-[11.5px] leading-relaxed text-ink-mid">{deal.notes}</p>
          </Inset>

          <StickyActions>

            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
            <Button variant="secondary" size="md" icon={<Receipt />} onClick={() => pushToast({ kind: 'success', title: 'Invoice generated', body: `Draft invoice for ${deal.brand} — ${fmtCurrency(deal.fee)}.` })}>
              Invoice
            </Button>
            <Button variant="primary" size="md" className="ml-auto" icon={<CheckCircle2 />} onClick={() => pushToast({ kind: 'success', title: 'Deal advanced', body: `${deal.brand} moved forward in the pipeline.` })}>
              Advance stage
            </Button>
</StickyActions>
        </div>
      )}
    </Drawer>
  )
}
