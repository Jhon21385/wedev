import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  CircleDot,
  ExternalLink,
  FlaskConical,
  Grid2x2,
  Link2,
  List,
  MoveDiagonal,
  Quote,
  Sparkles,
  StickyNote,
  Table2,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { platformById } from '@/data/registry'
import { topicById } from '@/data/taxonomy'
import { topicColor } from '@/analytics/queries'
import { fmtDate, fmtNumber } from '@/lib/format'
import type { ResearchItem } from '@/data/types'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Segmented, SearchInput, Combobox } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { BubbleMatrix } from '@/components/charts/Special'
import { Distribution, RankedBars } from '@/components/charts/Bars'
import { ChartPanel, chartData } from '@/components/charts/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Tooltip } from '@/components/ui/Tooltip'

/* ============================================================================
   RESEARCH HUB
   A working library, not a bookmark folder. Items are graded by credibility,
   linked to the content they justify, and surfaced again on the page where the
   claim is made — so sources travel with the argument.
   ========================================================================== */

const KIND_META: Record<ResearchItem['kind'], { label: string; color: string; icon: typeof BookOpen }> = {
  source: { label: 'Source', color: '#5B9DFF', icon: BookOpen },
  stat: { label: 'Statistic', color: '#34D399', icon: TrendingUp },
  quote: { label: 'Quote', color: '#A78BFA', icon: Quote },
  note: { label: 'Note', color: '#FBBF24', icon: StickyNote },
  reference: { label: 'Reference', color: '#38D6F5', icon: Link2 },
  competitor: { label: 'Competitor', color: '#FB7185', icon: CircleDot },
  trend: { label: 'Trend', color: '#2DD4BF', icon: TrendingUp },
  example: { label: 'Example', color: '#D976FF', icon: Sparkles },
  screenshot: { label: 'Screenshot', color: '#8CBCFF', icon: Grid2x2 },
}

type View = 'grid' | 'list' | 'map'

export function ResearchPage() {
  const ds = useDataset()
  const settled = useSettled(200)
  const navigate = useNavigate()
  const [view, setView] = useState<View>('grid')
  const [kind, setKind] = useState<'all' | ResearchItem['kind']>('all')
  const [topic, setTopic] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ds.research.filter((r) => {
      if (kind !== 'all' && r.kind !== kind) return false
      if (topic.length && !topic.includes(r.topicId)) return false
      if (q && !(r.title.toLowerCase().includes(q) || (r.summary ?? '').toLowerCase().includes(q) || r.tags.some((t) => t.includes(q)))) return false
      return true
    })
  }, [ds.research, kind, topic, query])

  const open = ds.research.find((r) => r.id === openId) ?? null

  /* Tables behind the research map and the coverage chart. */
  const mapData = useMemo(
    () =>
      chartData(
        [
          { key: 'title', label: 'Source' },
          { key: 'topic', label: 'Topic' },
          { key: 'kind', label: 'Kind' },
          { key: 'days', label: 'Age (days)', align: 'right' },
          { key: 'credibility', label: 'Credibility', align: 'right', format: (v: number) => `${v}/5` },
          { key: 'cites', label: 'Citations', align: 'right' },
        ],
        ds.research.map((r) => ({
          title: r.title,
          topic: topicById(r.topicId).name,
          kind: KIND_META[r.kind].label,
          days: Math.max(1, Math.round((+new Date(ds.todayKey) - +new Date(r.createdAt)) / 86_400_000)),
          credibility: r.credibility,
          cites: r.linkedContentIds.length,
        })),
        { unit: 'source', caption: 'Research map — credibility against recency' },
      ),
    [ds],
  )

  const coverageData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Topic' },
          { key: 'sources', label: 'Sources', align: 'right' },
          { key: 'sourced', label: 'Pieces sourced', align: 'right' },
        ],
        ds.topics
          .map((t) => ({
            name: t.name,
            sources: ds.research.filter((r) => r.topicId === t.id).length,
            sourced: ds.content.filter((c) => c.topicId === t.id && c.researchIds.length > 0).length,
          }))
          .filter((r) => r.sources > 0)
          .sort((a, b) => b.sources - a.sources),
        { unit: 'topic', caption: 'Research coverage by topic' },
      ),
    [ds],
  )

  const stats = useMemo(() => {
    const linked = ds.research.filter((r) => r.linkedContentIds.length)
    const avg = ds.research.reduce((s, r) => s + r.credibility, 0) / ds.research.length
    const kinds = new Map<ResearchItem['kind'], number>()
    ds.research.forEach((r) => kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1))
    return {
      total: ds.research.length,
      avg,
      linked: linked.length,
      unsupported: ds.content.filter((c) => c.researchIds.length === 0).length,
      kinds: [...kinds.entries()].sort((a, b) => b[1] - a[1]),
    }
  }, [ds])

  if (!settled) {
    return (
      <Page width="full">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-3 h-4 w-[400px]" />
        <Skeleton className="mt-5 h-[520px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="full">
      <PageHeader
        eyebrow="Research"
        title="Research hub"
        description="Every claim worth making has a source. Grade it once here, and it shows up attached to every script that leans on it."
        actions={
          <Button variant="primary" size="md" icon={<FlaskConical />} onClick={() => useApp.getState().pushToast({ kind: 'info', title: 'New research item', body: 'Paste a link or write a note — both are first-class.' })}>
            Add research
          </Button>
        }
      />

      <MetricStrip
        className="mb-3.5"
        items={[
          { label: 'Items in library', value: String(stats.total), hint: `${stats.kinds[0]?.[1]} ${KIND_META[stats.kinds[0]?.[0] ?? 'source'].label.toLowerCase()} · ${stats.kinds[1]?.[1]} ${KIND_META[stats.kinds[1]?.[0] ?? 'source'].label.toLowerCase()}` },
          { label: 'Mean credibility', value: stats.avg.toFixed(1), hint: 'of 5 — weighted by use', accent: '#34D399' },
          { label: 'Cited by content', value: String(stats.linked), hint: `${((stats.linked / stats.total) * 100).toFixed(0)}% of library is live` },
          { label: 'Unsupported pieces', value: String(stats.unsupported), hint: 'content with no source attached', accent: stats.unsupported > 0 ? '#FBBF24' : undefined },
        ]}
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Research view"
          value={view}
          onChange={setView}
          options={[
            { id: 'grid', label: <span className="inline-flex items-center gap-1.5"><Grid2x2 className="h-3.5 w-3.5" /> Grid</span> },
            { id: 'list', label: <span className="inline-flex items-center gap-1.5"><List className="h-3.5 w-3.5" /> List</span> },
            { id: 'map', label: <span className="inline-flex items-center gap-1.5"><MoveDiagonal className="h-3.5 w-3.5" /> Map</span> },
          ]}
        />
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setKind('all')}
            className={cn(
              'h-7.5 rounded-md border px-2.5 text-[11px] transition-colors',
              kind === 'all' ? 'border-accent/35 bg-accent/[0.1] text-accent-ink' : 'border-line-2 text-ink-mid hover:border-line-3 hover:text-ink',
            )}
          >
            All
          </button>
          {stats.kinds.map(([k, count]) => {
            const meta = KIND_META[k]
            const active = kind === k
            return (
              <button
                key={k}
                onClick={() => setKind(active ? 'all' : k)}
                className={cn(
                  'inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors',
                  active ? 'border-line-4 bg-white/[0.07] text-ink-hi' : 'border-line-2 text-ink-mid hover:border-line-3 hover:text-ink',
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                {meta.label}
                <span className="mono text-[9.5px] text-ink-faint">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-[220px]">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, notes, tags…" onClear={() => setQuery('')} />
          </div>
          <Combobox
            multiple
            className="w-[196px]"
            placeholder="All topics"
            value={topic}
            onChange={setTopic}
            options={ds.topics.map((t) => ({ value: t.id, label: t.name, color: t.color, hint: t.description }))}
          />
        </div>
      </div>

      {view === 'grid' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ResearchCard key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
          ))}
          {!items.length && (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState icon={<FlaskConical />} title="Nothing matches that scope" body="Try a different kind, or clear the search to see the full library." />
            </div>
          )}
        </div>
      )}

      {view === 'list' && <ResearchTable items={items} onOpen={setOpenId} />}

      {view === 'map' && (
        <SplitGrid ratio="wide">
          <Panel>
            <PanelHeader
              icon={<MoveDiagonal />}
              title="Research map"
              subtitle="Vertical: credibility · horizontal: how recent · bubble: how many pieces cite it"
            />
            <div className="p-4">
              <ChartPanel bare data={mapData}>
                <BubbleMatrix
                  height={420}
                  xLabel="Days since added (recent → older)"
                yLabel="Credibility (1–5)"
                zLabel="Linked content"
                xFormat={(v) => `${Math.round(v)}d`}
                yFormat={(v) => `${v}/5`}
                zFormat={(v) => `${v} citation${v === 1 ? '' : 's'}`}
                quadrants={['recent · trusted', 'older · trusted', 'recent · thin', 'older · thin']}
                selectedId={openId}
                onSelect={setOpenId}
                points={ds.research.map((r) => {
                  const days = Math.max(1, Math.round((+new Date(ds.todayKey) - +new Date(r.createdAt)) / 86_400_000))
                  return {
                    id: r.id,
                    x: days,
                    y: r.credibility,
                    z: Math.max(1, r.linkedContentIds.length),
                    color: topicColor(ds, r.topicId),
                    label: r.title,
                    platform: topicById(r.topicId).name,
                    meta: `${KIND_META[r.kind].label} · ${r.linkedContentIds.length} citation${r.linkedContentIds.length === 1 ? '' : 's'}`,
                  }
                })}
                />
              </ChartPanel>
            </div>
          </Panel>
          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<TrendingUp />} title="Coverage by topic" subtitle="Where your evidence is strongest" />
              <div className="p-4">
                <RankedBars
                  height={230}
                  metricId="views"
                  onSelect={(id) => setTopic([id])}
                  rows={ds.topics
                    .map((t) => ({
                      id: t.id,
                      label: t.name,
                      value: ds.research.filter((r) => r.topicId === t.id).length,
                      color: t.color,
                      sub: `${ds.content.filter((c) => c.topicId === t.id && c.researchIds.length > 0).length} pieces sourced`,
                    }))
                    .filter((r) => r.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10)}
                />
              </div>
            </Panel>
            <Panel>
              <PanelHeader dense icon={<Sparkles />} title="Gaps worth filling" subtitle="High-performing topics with thin evidence" />
              <ul className="divide-y divide-[var(--color-line-1)]">
                {ds.topics
                  .map((t) => {
                    const published = ds.content.filter((c) => c.topicId === t.id && c.performance)
                    const views = published.reduce((s, c) => s + (c.performance?.views ?? 0), 0)
                    const sources = ds.research.filter((r) => r.topicId === t.id).length
                    return { t, views, sources, ratio: views / Math.max(1, sources) }
                  })
                  .filter((x) => x.views > 300_000 && x.sources < 2)
                  .sort((a, b) => b.ratio - a.ratio)
                  .slice(0, 4)
                  .map((x) => (
                    <li key={x.t.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: x.t.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-ink-hi">{x.t.name}</span>
                        <span className="block text-[10px] text-ink-faint">
                          {fmtNumber(x.views, { compact: true })} views on {x.sources} source{x.sources === 1 ? '' : 's'}
                        </span>
                      </span>
                      <Badge tone="warn" size="xs">
                        thin
                      </Badge>
                    </li>
                  ))}
              </ul>
            </Panel>
          </div>
        </SplitGrid>
      )}

      <ResearchDrawer item={open} onClose={() => setOpenId(null)} onOpenContent={(id) => navigate(`/content/${id}`)} />
    </Page>
  )
}

/* ============================================================================
   PRESENTATIONS
   ========================================================================== */
function ResearchCard({ item, onOpen }: { item: ResearchItem; onOpen: () => void }) {
  const meta = KIND_META[item.kind]
  const Icon = meta.icon
  return (
    <article
      onClick={onOpen}
      className="group flex cursor-pointer flex-col rounded-xl border border-line-2 bg-panel p-3.5 transition-all duration-250 hover:-translate-y-0.5 hover:border-line-3 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)]"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge size="xs" style={{ background: `${meta.color}1A`, color: meta.color, borderColor: `${meta.color}38` }}>
          <Icon className="h-2.5 w-2.5" /> {meta.label}
        </Badge>
        <span className="mono shrink-0 text-[9.5px] text-ink-faint">{item.code}</span>
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-[12.5px] font-medium leading-snug text-ink-hi">{item.title}</h3>
      {item.quote ? (
        <p className="mt-2 line-clamp-3 border-l-2 border-violet/40 pl-2.5 text-[11.5px] italic leading-relaxed text-ink-mid">“{item.quote}”</p>
      ) : (
        item.summary && <p className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-ink-low">{item.summary}</p>
      )}

      {item.dataPoints && (
        <div className="mt-3">
          <Distribution rows={item.dataPoints} color={meta.color} height={44} valueSuffix="" />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-1 pt-2.5">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: topicColor(useDataset(), item.topicId) }} />
          <span className="truncate text-[10px] text-ink-faint">{topicById(item.topicId).name}</span>
        </span>
        <span className="flex items-center gap-2">
          {item.linkedContentIds.length > 0 && (
            <span className="mono flex items-center gap-1 text-[9.5px] text-ink-faint">
              <Link2 className="h-2.5 w-2.5" />
              {item.linkedContentIds.length}
            </span>
          )}
          <span className="flex gap-[2px]" title={`Credibility ${item.credibility}/5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="h-2 w-[3px] rounded-full" style={{ background: i < item.credibility ? meta.color : 'rgba(255,255,255,0.08)' }} />
            ))}
          </span>
        </span>
      </div>
    </article>
  )
}

function ResearchTable({ items, onOpen }: { items: ResearchItem[]; onOpen: (id: string) => void }) {
  const ds = useDataset()
  const columns: Column<ResearchItem>[] = [
    { id: 'title', header: 'Title', primary: true, width: 320, sortValue: (r) => r.title, filterValue: (r) => r.title, cell: (r) => (
      <span className="min-w-0">
        <span className="block truncate text-[12px] text-ink-hi">{r.title}</span>
        <span className="mono block truncate text-[9.5px] text-ink-faint">{r.code}</span>
      </span>
    ) },
    { id: 'kind', header: 'Kind', width: 110, sortValue: (r) => r.kind, filterValue: (r) => KIND_META[r.kind].label, cell: (r) => (
      <span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: KIND_META[r.kind].color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_META[r.kind].color }} />
        {KIND_META[r.kind].label}
      </span>
    ) },
    { id: 'topic', header: 'Topic', width: 140, sortValue: (r) => topicById(r.topicId).name, filterValue: (r) => topicById(r.topicId).name, cell: (r) => <span className="text-[11.5px] text-ink-mid">{topicById(r.topicId).name}</span> },
    { id: 'cred', header: 'Credibility', width: 108, align: 'right', numeric: true, sortValue: (r) => r.credibility, cell: (r) => (
      <span className="flex items-center justify-end gap-1.5">
        <span className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.07]">
          <span className="block h-full rounded-full" style={{ width: `${(r.credibility / 5) * 100}%`, background: KIND_META[r.kind].color }} />
        </span>
        <span className="mono text-[10.5px] text-ink-mid">{r.credibility}/5</span>
      </span>
    ) },
    { id: 'cited', header: 'Cited', width: 76, align: 'right', numeric: true, sortValue: (r) => r.linkedContentIds.length, cell: (r) => <span className="tnum text-ink-hi">{r.linkedContentIds.length}</span> },
    { id: 'added', header: 'Added', width: 92, sortValue: (r) => r.createdAt, cell: (r) => <span className="mono text-[10.5px] text-ink-low">{fmtDate(r.createdAt, 'short')}</span> },
    { id: 'actions', header: '', width: 44, cell: (r) => <IconButton label="Open" icon={<ArrowUpRight />} size="xs" onClick={(e) => { e.stopPropagation(); onOpen(r.id) }} /> },
  ]
  return (
    <DataTable
      rows={items}
      columns={columns}
      onRowClick={(r) => onOpen(r.id)}
      empty={<EmptyState icon={<FlaskConical />} title="No research in scope" body="Adjust the filters or add a new source." />}
      footer={<span className="mono text-[10.5px] text-ink-faint">{items.length} of {ds.research.length} items · credibility is graded by you, not scraped</span>}
    />
  )
}

function ResearchDrawer({ item, onClose, onOpenContent }: { item: ResearchItem | null; onClose: () => void; onOpenContent: (id: string) => void }) {
  const ds = useDataset()
  return (
    <Drawer open={!!item} onClose={onClose} width={468} title={item ? KIND_META[item.kind].label : undefined}>
      {item && (
        <div className="scroll-fade-y h-full overflow-y-auto p-4">
          <p className="mono text-[10px] text-ink-faint">{item.code}</p>
          <h2 className="mt-1 text-[16px] font-semibold leading-snug tracking-[-0.015em] text-ink-hi">{item.title}</h2>

          {item.quote && (
            <blockquote className="mt-3 rounded-lg border border-violet/25 bg-violet/[0.06] p-3">
              <Quote className="h-3.5 w-3.5 text-violet" />
              <p className="mt-1.5 text-[12.5px] italic leading-relaxed text-ink">{item.quote}</p>
              {item.author && <footer className="mt-1.5 text-[10.5px] text-ink-low">— {item.author}</footer>}
            </blockquote>
          )}

          {item.summary && <p className="mt-3 text-[12px] leading-relaxed text-ink-mid">{item.summary}</p>}

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-line-2 pt-4">
            <KeyValue label="Kind" value={KIND_META[item.kind].label} />
            <KeyValue label="Topic" value={topicById(item.topicId).name} />
            <KeyValue label="Credibility" value={`${item.credibility} / 5`} />
            <KeyValue label="Added" value={fmtDate(item.createdAt, 'long')} mono />
            {item.source && <KeyValue label="Source" value={item.source} />}
            <KeyValue label="Cited by" value={`${item.linkedContentIds.length} pieces`} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="cell-label">Credibility</span>
              <span className="mono text-[10.5px] text-ink-mid">{item.credibility}/5</span>
            </div>
            <Progress value={item.credibility} max={5} color={KIND_META[item.kind].color} />
          </div>

          {item.dataPoints && item.dataPoints.length > 0 && (
            <div className="mt-4">
              <p className="cell-label mb-2">Data points</p>
              <Panel className="p-3">
                <Distribution rows={item.dataPoints} color={KIND_META[item.kind].color} height={70} valueSuffix="" />
                <ul className="mt-3 space-y-1.5 border-t border-line-1 pt-2.5">
                  {item.dataPoints.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-3">
                      <span className="truncate text-[11.5px] text-ink-mid">{d.label}</span>
                      <span className="tnum shrink-0 text-[11.5px] text-ink-hi">{fmtNumber(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}

          <div className="mt-4">
            <p className="cell-label mb-2">Cited by</p>
            {item.linkedContentIds.length ? (
              <ul className="space-y-1">
                {item.linkedContentIds.map((cid) => {
                  const c = ds.content.find((x) => x.id === cid)
                  if (!c) return null
                  return (
                    <li key={cid}>
                      <button onClick={() => onOpenContent(cid)} className="flex w-full items-center gap-2.5 rounded-lg border border-line-2 px-2.5 py-2 text-left transition-colors hover:border-line-3 hover:bg-white/[0.03]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(c.platforms[0]).color }} />
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{c.title}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-ghost" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-line-2 px-3 py-3 text-[11.5px] text-ink-faint">
                Not cited yet. Attach it from any script's research tab.
              </p>
            )}
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-accent transition-colors hover:text-accent-ink"
            >
              <ExternalLink className="h-3 w-3" /> Open original
            </a>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <Badge key={t} tone="outline" size="xs">
                {t}
              </Badge>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-4 mt-5 flex items-center gap-2 border-t border-line-2 bg-surface-1/95 px-4 py-3 backdrop-blur-xl">
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="accent-soft"
              size="md"
              icon={<Link2 />}
              onClick={() => useApp.getState().pushToast({ kind: 'success', title: 'Attached to current script', body: `“${item.title}” is now cited in the open piece.` })}
            >
              Attach to script
            </Button>
            <Tooltip content="Attach to a different piece" side="top">
              <Button variant="secondary" size="md" className="ml-auto" icon={<Table2 />} onClick={() => useApp.getState().openPanel('research', { label: item.title })}>
                Side panel
              </Button>
            </Tooltip>
          </div>
        </div>
      )}
    </Drawer>
  )
}
