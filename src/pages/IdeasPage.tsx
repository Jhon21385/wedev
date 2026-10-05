import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CircleDot,
  Columns3,
  Flame,
  Grid2x2,
  Lightbulb,
  MoveDiagonal,
  Plus,
  Rocket,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { formatById, platformById } from '@/data/registry'
import { clusterById, topicById } from '@/data/taxonomy'
import { fmtDate, fmtNumber } from '@/lib/format'
import { ideaScore } from '@/data/seed/ideas'
import type { Idea } from '@/data/types'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { DescriptionList, StickyActions } from '@/components/ui/blocks'
import { Segmented, Slider, Textarea } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { BubbleMatrix } from '@/components/charts/Special'
import { ShareBar } from '@/components/charts/Bars'
import { ChartPanel, chartData } from '@/components/charts/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Tooltip } from '@/components/ui/Tooltip'

/* ============================================================================
   IDEA VAULT
   Ideas are scored products, not sticky notes. Four projections:
     · Board    — pipeline of thought by validation state
     · Table    — sortable scoring ledger
     · Clusters — thematic portfolio balance
     · Matrix   — impact vs effort, the promotion decision surface
   ========================================================================== */

type View = 'board' | 'table' | 'clusters' | 'matrix'

const STATUS_ORDER: Idea['status'][] = ['raw', 'exploring', 'validated', 'promoted', 'parked']

const STATUS_META: Record<Idea['status'], { label: string; color: string; hint: string }> = {
  raw: { label: 'Raw', color: '#6A7284', hint: 'Captured, not yet examined' },
  exploring: { label: 'Exploring', color: '#38D6F5', hint: 'Being researched or validated' },
  validated: { label: 'Validated', color: '#34D399', hint: 'Worth producing — waiting for a slot' },
  promoted: { label: 'Promoted', color: '#5B9DFF', hint: 'Became a content object' },
  parked: { label: 'Parked', color: '#FB7185', hint: 'Not now — revisit with new information' },
}

const DIMENSIONS: { id: keyof Idea['scores']; label: string; short: string; invert?: boolean }[] = [
  { id: 'audienceRelevance', label: 'Audience relevance', short: 'Audience' },
  { id: 'originality', label: 'Originality', short: 'Original' },
  { id: 'effort', label: 'Effort', short: 'Effort', invert: true },
  { id: 'potentialReach', label: 'Potential reach', short: 'Reach' },
  { id: 'strategicRelevance', label: 'Strategic relevance', short: 'Strategy' },
]

export function IdeasPage() {
  const ds = useDataset()
  const settled = useSettled(200)
  const [view, setView] = useState<View>('board')
  const [openId, setOpenId] = useState<string | null>(null)
  const setCreateOpen = useApp((s) => s.setCreateOpen)
  const ideas = ds.ideas
  const open = ideas.find((i) => i.id === openId) ?? null

  const summary = useMemo(() => {
    const scored = ideas.map((i) => ({ idea: i, score: ideaScore(i.scores) }))
    const promoted = ideas.filter((i) => i.status === 'promoted').length
    return {
      scored,
      total: ideas.length,
      validated: ideas.filter((i) => i.status === 'validated').length,
      promoted,
      avg: scored.reduce((s, x) => s + x.score, 0) / (scored.length || 1),
      top: [...scored].sort((a, b) => b.score - a.score).slice(0, 4),
      promotionRate: (promoted / (ideas.length || 1)) * 100,
    }
  }, [ideas])

  /* Idea portfolio tables — the same numbers the charts plot. */
  const clusterData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Cluster' },
          { key: 'ideas', label: 'Ideas', align: 'right' },
          { key: 'avgScore', label: 'Avg score', align: 'right', format: (v: number) => `${Math.round(v)}/100` },
          { key: 'potential', label: 'Reach potential', align: 'right' },
        ],
        ds.clusters
          .map((c) => {
            const items = summary.scored.filter((x) => x.idea.clusterId === c.id)
            const avg = items.length ? items.reduce((a, x) => a + x.score, 0) / items.length : 0
            return { name: c.name, ideas: items.length, avgScore: Math.round(avg), potential: items.reduce((a, x) => a + x.idea.potential, 0) }
          })
          .filter((r) => r.ideas > 0),
        { unit: 'cluster', caption: 'Idea clusters by volume and average quality' },
      ),
    [ds, summary],
  )

  const balanceData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Cluster' },
          { key: 'ideas', label: 'Ideas', align: 'right' },
        ],
        ds.clusters.map((c) => ({ name: c.name, ideas: summary.scored.filter((x) => x.idea.clusterId === c.id).length })),
        { unit: 'cluster', caption: 'Portfolio balance across clusters' },
      ),
    [ds, summary],
  )

  const stageMixData = useMemo(
    () =>
      chartData(
        [
          { key: 'stage', label: 'Stage' },
          { key: 'ideas', label: 'Ideas', align: 'right' },
        ],
        STATUS_ORDER.map((st) => ({ stage: STATUS_META[st].label, ideas: ideas.filter((i) => i.status === st).length })),
        { unit: 'stage', caption: 'Idea stage mix' },
      ),
    [ideas],
  )

  const matrixData = useMemo(
    () =>
      chartData(
        [
          { key: 'title', label: 'Idea' },
          { key: 'topic', label: 'Topic' },
          { key: 'effort', label: 'Effort', align: 'right', format: (v: number) => `${v}/5` },
          { key: 'score', label: 'Score', align: 'right', format: (v: number) => `${Math.round(v)}/100` },
          { key: 'potential', label: 'Potential', align: 'right', format: (v: number) => `${v}/5` },
          { key: 'status', label: 'Status' },
        ],
        summary.scored.map(({ idea, score }) => ({
          title: idea.title,
          topic: topicById(idea.topicId).name,
          effort: idea.scores.effort,
          score: Math.round(score),
          potential: idea.potential,
          status: idea.status,
        })),
        { unit: 'idea', caption: 'Ideas plotted by effort against composite score' },
      ),
    [summary],
  )

  if (!settled) {
    return (
      <Page width="full">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-[380px]" />
        <Skeleton className="mt-5 h-[520px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="full">
      <PageHeader
        eyebrow="Workspace"
        title="Idea vault"
        description="Every idea carries five scores. Promotion is a decision, not a feeling — and one click turns the best of them into a content object."
        meta={
          <span className="text-[11.5px] text-ink-low">
            {summary.total} ideas · {summary.validated} validated · {summary.promoted} promoted ({summary.promotionRate.toFixed(0)}% conversion)
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="md" icon={<Sparkles />} onClick={() => useApp.getState().pushToast({ kind: 'info', title: 'Scoring your vault', body: 'Re-ranking by strategic relevance and effort.' })}>
              Re-score vault
            </Button>
            <Button variant="primary" size="md" icon={<Plus />} onClick={() => setCreateOpen(true, 'idea')}>
              Capture idea
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-3.5"
        items={[
          { label: 'Ideas in vault', value: String(summary.total), hint: `${STATUS_ORDER.map((s) => ideas.filter((i) => i.status === s).length).join(' · ')} across stages` },
          { label: 'Average score', value: `${summary.avg.toFixed(0)}`, hint: 'weighted across five dimensions' },
          { label: 'Ready to produce', value: String(summary.validated), hint: 'validated and unscheduled', accent: '#5B9DFF' },
          {
            label: 'Heat',
            value: String(ideas.filter((i) => i.potential >= 4).length),
            hint: 'ideas scoring 4+ potential reach',
            accent: '#FBBF24',
          },
        ]}
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Idea view"
          value={view}
          onChange={setView}
          options={[
            { id: 'board', label: <span className="inline-flex items-center gap-1.5"><Columns3 className="h-3.5 w-3.5" /> Board</span> },
            { id: 'table', label: <span className="inline-flex items-center gap-1.5"><Table2 className="h-3.5 w-3.5" /> Table</span> },
            { id: 'clusters', label: <span className="inline-flex items-center gap-1.5"><Grid2x2 className="h-3.5 w-3.5" /> Clusters</span> },
            { id: 'matrix', label: <span className="inline-flex items-center gap-1.5"><MoveDiagonal className="h-3.5 w-3.5" /> Matrix</span> },
          ]}
        />
        <span className="mono ml-auto text-[10.5px] text-ink-faint">
          scale 1–5 · composite weights strategy 1.3 · reach 1.1 · audience 1.2 · effort inverted
        </span>
      </div>

      {view === 'board' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-h-[520px] gap-3" style={{ width: `${STATUS_ORDER.length * 278}px` }}>
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status]
              const items = summary.scored.filter((s) => s.idea.status === status).sort((a, b) => b.score - a.score)
              return (
                <section key={status} className="flex w-[266px] shrink-0 flex-col rounded-xl border border-line-2 bg-panel/70">
                  <header className="flex items-center justify-between gap-2 border-b border-line-1 px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 7px ${meta.color}99` }} />
                      <span className="text-[11.5px] font-medium text-ink-hi">{meta.label}</span>
                    </span>
                    <span className="mono text-[10px] text-ink-faint">{items.length}</span>
                  </header>
                  <p className="border-b border-line-1 px-3 py-1.5 text-[10px] text-ink-faint">{meta.hint}</p>
                  <div className="scroll-fade-y min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                    {items.map(({ idea, score }) => (
                      <IdeaCard key={idea.id} idea={idea} score={score} onOpen={() => setOpenId(idea.id)} />
                    ))}
                    {!items.length && <p className="px-1 py-6 text-center text-[10.5px] text-ink-ghost">Nothing here yet</p>}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {view === 'table' && <IdeasTable />}

      {view === 'clusters' && (
        <SplitGrid ratio="wide">
          <div className="grid gap-3 sm:grid-cols-2">
            {ds.clusters.map((cluster) => {
              const items = summary.scored.filter((s) => s.idea.clusterId === cluster.id)
              const avg = items.length ? items.reduce((s, x) => s + x.score, 0) / items.length : 0
              const best = [...items].sort((a, b) => b.score - a.score)[0]
              return (
                <Panel key={cluster.id} interactive className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 text-[13px] font-medium text-ink-hi">
                        <span className="h-2 w-2 rounded-full" style={{ background: cluster.color, boxShadow: `0 0 8px ${cluster.color}88` }} />
                        {cluster.name}
                      </h3>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-low">{cluster.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[18px] font-semibold text-ink-hi">{items.length}</p>
                      <p className="cell-label">ideas</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <Progress value={avg} max={100} color={cluster.color} />
                    <span className="mono shrink-0 text-[10px] text-ink-faint">{avg.toFixed(0)} avg</span>
                  </div>
                  {best && (
                    <button onClick={() => setOpenId(best.idea.id)} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-line-2 bg-white/[0.014] px-2.5 py-2 text-left transition-colors hover:border-line-3 hover:bg-white/[0.035]">
                      <Flame className="h-3.5 w-3.5 shrink-0" style={{ color: cluster.color }} />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{best.idea.title}</span>
                      <span className="mono shrink-0 text-[10.5px] text-ink-mid">{best.score}</span>
                    </button>
                  )}
                </Panel>
              )
            })}
          </div>
          <div className="space-y-3.5">
          <Panel>
            <PanelHeader
              dense
              icon={<MoveDiagonal />}
              title="Topic map"
              subtitle="Clusters positioned by volume and average quality — bubble is reach potential"
            />
            <div className="p-3">
              <ChartPanel bare data={clusterData}>
                <BubbleMatrix
                  height={236}
                  xLabel="Ideas in cluster"
                  yLabel="Average score"
                  zLabel="Reach potential"
                  xFormat={(v) => `${Math.round(v)} ideas`}
                  yFormat={(v) => `${Math.round(v)}/100`}
                  zFormat={(v) => `${v} total potential`}
                  points={ds.clusters
                    .map((c) => {
                      const items = summary.scored.filter((s) => s.idea.clusterId === c.id)
                      const avg = items.length ? items.reduce((s, x) => s + x.score, 0) / items.length : 0
                      const reach = items.reduce((s, x) => s + x.idea.potential, 0)
                      return {
                        id: c.id,
                        x: items.length,
                        y: Math.round(avg),
                        z: reach,
                        color: c.color,
                        label: c.name,
                        platform: `${items.length} ideas`,
                        meta: `avg ${Math.round(avg)}/100 · ${reach} reach potential`,
                      }
                    })
                    .filter((p) => p.x > 0)}
                  onSelect={(id) => {
                    const list = summary.scored.filter((s) => s.idea.clusterId === id).sort((a, b) => b.score - a.score)
                    if (list[0]) setOpenId(list[0].idea.id)
                  }}
                />
              </ChartPanel>
            </div>
          </Panel>
          <Panel className="h-fit">
            <PanelHeader dense icon={<TrendingUp />} title="Portfolio balance" subtitle="Where your attention is currently pointed" />
            <div className="p-3.5">
              <ChartPanel bare data={balanceData}>
                <ShareBar
                  segments={ds.clusters.map((c) => ({
                    id: c.id,
                    label: c.name,
                    value: summary.scored.filter((s) => s.idea.clusterId === c.id).length,
                    color: c.color,
                  }))}
                  showLabels
                />
              </ChartPanel>
              <div className="mt-4 space-y-2.5 border-t border-line-1 pt-3.5">
                <p className="cell-label">Stage mix</p>
                <ChartPanel bare data={stageMixData}>
                  <ShareBar
                    segments={STATUS_ORDER.map((s) => ({ id: s, label: STATUS_META[s].label, value: ideas.filter((i) => i.status === s).length, color: STATUS_META[s].color }))}
                    showLabels
                  />
                </ChartPanel>
              </div>
            </div>
          </Panel>
          </div>
        </SplitGrid>
      )}

      {view === 'matrix' && (
        <Panel>
          <PanelHeader
            icon={<MoveDiagonal />}
            title="Impact vs effort"
            subtitle="Bubble size is potential reach · colour is topic · upper-left is where you want to live"
            actions={<Badge tone="accent" size="xs">promotion zone</Badge>}
          />
          <div className="p-4">
            <ChartPanel bare data={matrixData}>
              <BubbleMatrix
                height={420}
              xLabel="Effort to produce (1 easy → 5 heavy)"
              yLabel="Composite score (audience + originality + strategy)"
              zLabel="Potential reach"
              xFormat={(v) => `${v}/5`}
              yFormat={(v) => `${Math.round(v)}/100`}
              zFormat={(v) => `${v}/5 potential`}
              quadrants={['promote first', 'needs a plan', 'quick wins', 'park for now']}
              selectedId={openId}
              onSelect={(id) => setOpenId(id)}
              points={summary.scored.map(({ idea, score }) => {
                const topic = topicById(idea.topicId)
                return {
                  id: idea.id,
                  x: idea.scores.effort,
                  y: score,
                  z: idea.potential,
                  color: topic.color,
                  label: idea.title,
                  platform: idea.platforms.map((p) => platformById(p).short).join(' · '),
                  meta: `${topic.name} · ${idea.status}`,
                }
              })}
              />
            </ChartPanel>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-line-2 px-4 py-2.5">
            <span className="text-[10.5px] text-ink-faint">Quadrants: high impact / low effort → promote first · low impact / high effort → park</span>
            <span className="mono ml-auto text-[10px] text-ink-ghost">{summary.scored.length} plotted</span>
          </div>
        </Panel>
      )}

      <IdeaDrawer
        idea={open}
        onClose={() => setOpenId(null)}
        onPromoted={(title) => {
          useApp.getState().pushToast({ kind: 'success', title: 'Promoted to content', body: `“${title}” now sits in the Idea stage of the content pipeline.` })
          setOpenId(null)
        }}
      />
    </Page>
  )
}

/* ============================================================================
   CARD + TABLE
   ========================================================================== */
function IdeaCard({ idea, score, onOpen }: { idea: Idea; score: number; onOpen: () => void }) {
  const topic = topicById(idea.topicId)
  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer rounded-lg border border-line-2 bg-surface-1 p-2.5 transition-all duration-200 hover:border-line-3 hover:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-ink-hi">{idea.title}</h3>
        <span className="score badge grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${scoreColor(score)}44`, background: `${scoreColor(score)}15` }}>
          <span className="tnum text-[12.5px] font-semibold" style={{ color: scoreColor(score) }}>
            {score}
          </span>
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-ink-low">{idea.hook}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: topic.color }} />
        <span className="truncate text-[10px] text-ink-faint">{topic.name}</span>
        <span className="text-ink-ghost">·</span>
        <span className="truncate text-[10px] text-ink-faint">{formatById(idea.format).name}</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {DIMENSIONS.map((d) => (
          <Tooltip key={d.id} content={`${d.label}: ${idea.scores[d.id]}/5${d.invert ? ' (inverted)' : ''}`} side="bottom">
            <span className="block">
              <span className="flex gap-[2px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-[3px] flex-1 rounded-full"
                    style={{ background: i < idea.scores[d.id] ? (d.invert ? '#FB7185' : topic.color) : 'rgba(255,255,255,0.07)' }}
                  />
                ))}
              </span>
              <span className="mt-1 block truncate text-[8.5px] text-ink-ghost">{d.short}</span>
            </span>
          </Tooltip>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line-1 pt-2">
        <span className="flex items-center gap-1">
          {idea.platforms.map((p) => (
            <span key={p} className="mono text-[9px]" style={{ color: platformById(p).color }}>
              {platformById(p).short}
            </span>
          ))}
        </span>
        <span className="mono text-[9px] text-ink-ghost">{fmtDate(idea.createdAt, 'short')}</span>
      </div>
    </article>
  )
}

function IdeasTable() {
  const ds = useDataset()
  const [openId, setOpenId] = useState<string | null>(null)
  const columns: Column<Idea>[] = [
    { id: 'title', header: 'Idea', primary: true, width: 300, sortValue: (i) => i.title, filterValue: (i) => i.title, cell: (i) => (
      <span className="min-w-0">
        <span className="block truncate text-[12px] text-ink-hi">{i.title}</span>
        <span className="mono block truncate text-[9.5px] text-ink-faint">{i.code}</span>
      </span>
    ) },
    { id: 'score', header: 'Score', width: 86, align: 'right', numeric: true, sortValue: (i) => ideaScore(i.scores), cell: (i) => {
      const s = ideaScore(i.scores)
      return <span className="tnum font-semibold" style={{ color: scoreColor(s) }}>{s}</span>
    } },
    ...DIMENSIONS.map((d) => ({
      id: d.id,
      header: d.short,
      width: 84,
      align: 'right' as const,
      numeric: true,
      sortValue: (i: Idea) => i.scores[d.id],
      cell: (i: Idea) => (
        <span className="flex items-center justify-end gap-1">
          {Array.from({ length: 5 }).map((_, n) => (
            <span key={n} className="h-2 w-1 rounded-full" style={{ background: n < i.scores[d.id] ? (d.invert ? '#FB7185' : 'var(--color-accent)') : 'rgba(255,255,255,0.08)' }} />
          ))}
          <span className="mono ml-1 text-[10px] text-ink-faint">{i.scores[d.id]}</span>
        </span>
      ),
    })),
    { id: 'topic', header: 'Topic', width: 130, sortValue: (i) => topicById(i.topicId).name, filterValue: (i) => topicById(i.topicId).name, cell: (i) => <span className="text-[11.5px] text-ink-mid">{topicById(i.topicId).name}</span> },
    { id: 'cluster', header: 'Cluster', width: 130, sortValue: (i) => clusterById(i.clusterId).name, filterValue: (i) => clusterById(i.clusterId).name, cell: (i) => <span className="text-[11.5px] text-ink-mid">{clusterById(i.clusterId).name}</span> },
    { id: 'status', header: 'Stage', width: 100, sortValue: (i) => STATUS_ORDER.indexOf(i.status), filterValue: (i) => STATUS_META[i.status].label, cell: (i) => <Badge tone={i.status === 'promoted' ? 'accent' : 'outline'} size="xs">{STATUS_META[i.status].label}</Badge> },
    { id: 'created', header: 'Added', width: 92, sortValue: (i) => i.createdAt, cell: (i) => <span className="mono text-[10.5px] text-ink-low">{fmtDate(i.createdAt, 'short')}</span> },
    { id: 'actions', header: '', width: 44, cell: (i) => <IconButton label="Open" icon={<ArrowUpRight />} size="xs" onClick={(e) => { e.stopPropagation(); setOpenId(i.id) }} /> },
  ]
  const open = ds.ideas.find((i) => i.id === openId) ?? null
  return (
    <>
      <DataTable
        rows={ds.ideas}
        columns={columns}
        rowHeight={44}
        onRowClick={(i) => setOpenId(i.id)}
        empty={<EmptyState icon={<Lightbulb />} title="No ideas yet" body="Capture the first one — it takes ten seconds." />}
        footer={<span className="mono text-[10.5px] text-ink-faint">{ds.ideas.length} ideas · scoring is deterministic from the five dimensions</span>}
      />
      <IdeaDrawer idea={open} onClose={() => setOpenId(null)} onPromoted={() => setOpenId(null)} />
    </>
  )
}

/* ============================================================================
   DRAWER
   ========================================================================== */
function IdeaDrawer({ idea, onClose, onPromoted }: { idea: Idea | null; onClose: () => void; onPromoted: (title: string) => void }) {
  const ds = useDataset()
  const navigate = useNavigate()
  const [local, setLocal] = useState<Idea['scores'] | null>(null)
  const scores = local ?? idea?.scores ?? null
  const score = scores ? ideaScore(scores) : 0

  return (
    <Drawer open={!!idea} onClose={onClose} width={468} title={idea ? 'Idea scorecard' : undefined}>
      {idea && scores && (
        <div className="scroll-fade-y h-full overflow-y-auto p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="mono text-[10px] text-ink-faint">{idea.code}</p>
              <h2 className="mt-1 text-[16px] font-semibold leading-snug tracking-[-0.015em] text-ink-hi">{idea.title}</h2>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border" style={{ borderColor: `${scoreColor(score)}55`, background: `${scoreColor(score)}14` }}>
              <span className="tnum text-[19px] font-semibold" style={{ color: scoreColor(score) }}>
                {score}
              </span>
            </div>
          </div>

          <p className="mt-3 rounded-lg border border-line-2 bg-white/[0.02] p-3 text-[12px] leading-relaxed text-ink">{idea.hook}</p>

          <div className="mt-3.5 space-y-3">
            {DIMENSIONS.map((d) => (
              <div key={d.id}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="cell-label">{d.label}</span>
                  <span className="mono text-[10.5px] text-ink-mid">
                    {scores[d.id]}/5 {d.invert && <span className="text-rose">inverted</span>}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={scores[d.id]}
                  onChange={(v) => setLocal({ ...scores, [d.id]: v })}
                  ariaLabel={d.label}
                  color={d.invert ? '#FB7185' : 'var(--color-accent)'}
                />
              </div>
            ))}
          </div>

          <DescriptionList divider className="gap-y-3">
            <KeyValue label="Topic" value={topicById(idea.topicId).name} />
            <KeyValue label="Cluster" value={clusterById(idea.clusterId).name} />
            <KeyValue label="Format" value={formatById(idea.format).name} />
            <KeyValue label="Potential" value={`${idea.potential}/5`} />
            <KeyValue label="Status" value={STATUS_META[idea.status].label} />
            <KeyValue label="Added" value={fmtDate(idea.createdAt, 'long')} mono />
          </DescriptionList>

          <div className="mt-4">
            <p className="cell-label mb-1.5">Problem it solves</p>
            <p className="text-[12px] leading-relaxed text-ink-mid">{idea.problem}</p>
          </div>
          <div className="mt-3.5">
            <p className="cell-label mb-1.5">Audience</p>
            <p className="text-[12px] leading-relaxed text-ink-mid">{idea.audience}</p>
          </div>

          {idea.references.length > 0 && (
            <div className="mt-4">
              <p className="cell-label mb-2">Attached research</p>
              <ul className="space-y-1">
                {idea.references.map((rid) => {
                  const item = ds.research.find((r) => r.id === rid)
                  if (!item) return null
                  return (
                    <li key={rid}>
                      <button onClick={() => navigate('/research')} className="flex w-full items-center gap-2 rounded-md border border-line-2 px-2.5 py-2 text-left transition-colors hover:border-line-3">
                        <CircleDot className="h-3 w-3 shrink-0 text-cyan" />
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{item.title}</span>
                        <span className="mono shrink-0 text-[9.5px] text-ink-faint">{fmtNumber(item.credibility)}/5</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <p className="cell-label mb-1.5">Notes</p>
            <Textarea rows={3} defaultValue={idea.notes} className="text-[12px]" />
          </div>

          <StickyActions>

            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
            <Button variant="secondary" size="md" icon={<Target />} onClick={() => useApp.getState().pushToast({ kind: 'info', title: 'Score saved', body: `Composite score is now ${score}.` })}>
              Save scoring
            </Button>
            <Button variant="primary" size="md" icon={<Rocket />} className="ml-auto" onClick={() => onPromoted(idea.title)}>
              Promote to content
            </Button>
</StickyActions>

          {idea.promotedContentId && (
            <p className="mt-3 flex items-center gap-2 text-[11px] text-emerald">
              <Zap className="h-3 w-3" /> Already promoted to content — open it from the pipeline.
            </p>
          )}
        </div>
      )}
    </Drawer>
  )
}

function scoreColor(score: number) {
  if (score >= 78) return '#34D399'
  if (score >= 62) return '#5B9DFF'
  if (score >= 48) return '#FBBF24'
  return '#FB7185'
}
