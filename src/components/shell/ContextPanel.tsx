import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  FlaskConical,
  GitBranch,
  Layers,
  ListChecks,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { contentTypeById, platformById, statusById } from '@/data/registry'
import { deltaPct, fmtDate, fmtDuration, fmtNumber, fmtRelativeFuture } from '@/lib/format'
import { attributeTotals, scopeContent } from '@/analytics/queries'
import { resolvePeriod } from '@/analytics/periods'
import { Badge, EmptyState, KeyValue, Progress, Ring, StatusPill } from '@/components/ui/Surface'
import { IconButton } from '@/components/ui/Button'
import { Sparkline } from '@/components/charts/LineArea'
import { scriptStats } from '@/data/seed/dataset'

/* ============================================================================
   RIGHT CONTEXT PANEL
   Appears when it earns its width, never by default. Content, focused without
   losing the list behind it. Escape closes; the panel never traps focus.
   ========================================================================== */

export function ContextPanel() {
  const kind = useApp((s) => s.rightPanel)
  const payload = useApp((s) => s.rightPanelPayload)
  const close = useApp((s) => s.closePanel)
  const ds = useDataset()
  const navigate = useNavigate()

  if (!kind) return null

  const content = payload.contentId ? ds.content.find((c) => c.id === payload.contentId) : undefined
  const idea = payload.ideaId ? ds.ideas.find((i) => i.id === payload.ideaId) : undefined

  const titles: Record<string, string> = {
    content: 'Content detail',
    analytics: 'Analytics detail',
    checklist: 'Production checklist',
    research: 'Research notes',
    timeline: 'Timeline',
    breakdown: 'Performance breakdown',
    drill: payload.label ?? 'Drill-through',
    idea: 'Idea detail',
  }

  return (
    <aside
      className="relative z-20 hidden w-[352px] shrink-0 animate-[panel-in_260ms_var(--ease-cockpit)_both] flex-col border-l border-line-2 bg-deep/80 backdrop-blur-xl xl:flex"
      aria-label={titles[kind] ?? 'Context panel'}
    >
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-line-2 px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-md border border-accent/25 bg-accent/[0.09]">
            <Sparkles className="h-3 w-3 text-accent" />
          </span>
          <h2 className="truncate text-[12px] font-semibold text-ink-hi">{titles[kind] ?? 'Context'}</h2>
        </div>
        <IconButton label="Close panel" icon={<X />} onClick={close} side="left" />
      </header>

      <div className="scroll-fade-y min-h-0 flex-1 overflow-y-auto">
        {kind === 'content' && content && <ContentDetailPanel contentId={content.id} />}
        {kind === 'idea' && idea && <IdeaDetailPanel ideaId={idea.id} />}
        {kind === 'checklist' && content && <ChecklistPanel contentId={content.id} />}
        {kind === 'research' && content && <ResearchPanel contentId={content.id} />}
        {kind === 'timeline' && content && <TimelinePanel contentId={content.id} />}
        {(kind === 'breakdown' || kind === 'analytics') && <BreakdownPanel contentId={content?.id} />}
        {kind === 'drill' && <DrillPanel />}
        {!content && !idea && kind !== 'breakdown' && kind !== 'analytics' && kind !== 'drill' && (
          <EmptyState
            compact
            icon={<Layers />}
            title="Nothing selected"
            body="Pick a row, a chart point or a pipeline stage to inspect it here."
            actions={
              <button onClick={() => navigate('/content')} className="text-[11.5px] text-accent transition-colors hover:text-accent-bright">
                Browse content →
              </button>
            }
          />
        )}
      </div>

      <style>{`
        @keyframes panel-in { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
      `}</style>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */
function ContentDetailPanel({ contentId }: { contentId: string }) {
  const ds = useDataset()
  const content = ds.content.find((c) => c.id === contentId)!
  const status = statusById(content.status)
  const type = contentTypeById(content.typeId)
  const platform = platformById(content.platforms[0])
  const openPanel = useApp((s) => s.openPanel)
  const period = resolvePeriod('30d')
  const perf = content.performance
  const series = ds.contentSeries[content.id] ?? []
  const windowed = series.filter((p) => p.date >= period.from && p.date <= period.to)
  const spark = windowed.map((p) => p.views)
  const stats = scriptStats(content.script)
  const done = content.checklist.filter((c) => c.done).length
  const topic = ds.topics.find((t) => t.id === content.topicId)
  const derivatives = ds.content.filter((c) => c.parentId === content.id || c.sourceId === content.id)

  return (
    <div className="space-y-3.5 p-3.5">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill name={status.name} color={status.accent} />
          <Badge tone="outline" size="xs" mono>
            {content.code}
          </Badge>
          <Badge tone={content.priority === 'critical' ? 'danger' : content.priority === 'high' ? 'warn' : 'neutral'} size="xs">
            {content.priority}
          </Badge>
        </div>
        <h3 className="mt-2 text-[13.5px] font-semibold leading-snug text-ink-hi">{content.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-low">
          <span style={{ color: platform.color }}>{platform.name}</span>
          <span className="text-ink-ghost">·</span>
          <span>{type.name}</span>
          <span className="text-ink-ghost">·</span>
          <span>{topic?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-line-1 bg-white/[0.016] p-2.5">
        <KeyValue label="Publish date" value={content.publishDate ? fmtDate(content.publishDate, 'long') : 'Unscheduled'} />
        <KeyValue label="Deadline" value={content.deadline ? fmtRelativeFuture(content.deadline) : '—'} />
        <KeyValue label="Script" value={`${fmtNumber(stats.words)} words`} hint={`~${stats.minutes.toFixed(1)} min read`} />
        <KeyValue label="Effort" value={`${content.effortHours} hrs`} hint={`${type.name}`} mono />
      </div>

      <Section title="Lifetime performance" icon={<TrendingUp />} action={perf ? <span className="mono text-[10px] text-ink-faint">all-time</span> : undefined}>
        {perf ? (
          <>
            <div className="grid grid-cols-2 gap-y-3">
              <KeyValue label="Views" value={fmtNumber(perf.views)} mono />
              <KeyValue label="Reach" value={fmtNumber(perf.reach)} mono />
              <KeyValue label="Engagements" value={fmtNumber(perf.engagements)} mono />
              <KeyValue label="Watch time" value={fmtDuration(perf.watchMinutes)} mono />
              <KeyValue label="Followers" value={`+${fmtNumber(perf.followersGained)}`} mono />
              <KeyValue label="Retention" value={`${perf.retention}%`} mono />
            </div>
            {spark.length > 1 && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line-1 bg-white/[0.016] px-2.5 py-2">
                <div>
                  <p className="cell-label">Last 30 days</p>
                  <p className="tnum mt-0.5 text-[13px] font-semibold text-ink-hi">{fmtNumber(windowed.reduce((s, p) => s + p.views, 0))}</p>
                </div>
                <Sparkline values={spark} color={platform.color} width={96} height={26} />
              </div>
            )}
          </>
        ) : (
          <p className="text-[11.5px] text-ink-low">Not published yet — performance appears here the moment the first impression lands.</p>
        )}
      </Section>

      <Section title="Production checklist" icon={<ListChecks />} action={<span className="mono text-[10px] text-ink-faint">{done}/{content.checklist.length}</span>}>
        <Progress value={done} max={content.checklist.length} color={done === content.checklist.length ? '#34D399' : 'var(--color-accent)'} />
        <ul className="mt-2.5 space-y-1">
          {content.checklist.slice(0, 6).map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-[11.5px]">
              <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-[4px] border', c.done ? 'border-emerald/40 bg-emerald/15' : 'border-line-3')}>
                {c.done && <CheckCircle2 className="h-2.5 w-2.5 text-emerald" />}
              </span>
              <span className={c.done ? 'text-ink-low line-through decoration-line-3' : 'text-ink'}>{c.label}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => openPanel('checklist', { contentId })} className="mt-2 text-[11px] text-accent transition-colors hover:text-accent-bright">
          Open full checklist →
        </button>
      </Section>

      {derivatives.length > 0 && (
        <Section title="Derivatives" icon={<GitBranch />} action={<span className="mono text-[10px] text-ink-faint">{derivatives.length}</span>}>
          <ul className="space-y-1.5">
            {derivatives.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/content/${d.id}`}
                  className="group flex items-center gap-2 rounded-lg border border-line-1 bg-white/[0.014] px-2.5 py-1.5 transition-colors hover:border-line-3 hover:bg-white/[0.03]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(d.platforms[0]).color }} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{d.title}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-faint transition-colors group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex gap-1.5">
        <Link
          to={`/content/${content.id}`}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/28 bg-accent/[0.1] text-[12px] font-medium text-accent-ink transition-colors hover:bg-accent/[0.17]"
        >
          <FileText className="h-3.5 w-3.5" /> Open workspace
        </Link>
      </div>
    </div>
  )
}

function ChecklistPanel({ contentId }: { contentId: string }) {
  const ds = useDataset()
  const content = ds.content.find((c) => c.id === contentId)!
  const groups: { id: string; label: string }[] = [
    { id: 'pre', label: 'Pre-production' },
    { id: 'shoot', label: 'Production' },
    { id: 'post', label: 'Post' },
    { id: 'publish', label: 'Publish' },
  ]
  return (
    <div className="space-y-4 p-3.5">
      <h3 className="text-[13px] font-semibold text-ink-hi">{content.title}</h3>
      {groups.map((g) => {
        const items = content.checklist.filter((c) => c.group === g.id)
        if (!items.length) return null
        const done = items.filter((c) => c.done).length
        return (
          <div key={g.id}>
            <div className="mb-2 flex items-center justify-between">
              <span className="cell-label">{g.label}</span>
              <span className="mono text-[10px] text-ink-faint">{done}/{items.length}</span>
            </div>
            <ul className="space-y-1">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] transition-colors hover:bg-white/[0.03]">
                  <span className={cn('grid h-4 w-4 place-items-center rounded-[5px] border', c.done ? 'border-emerald/40 bg-emerald/15' : 'border-line-3')}>
                    {c.done && <CheckCircle2 className="h-3 w-3 text-emerald" />}
                  </span>
                  <span className={c.done ? 'text-ink-low line-through decoration-line-3' : 'text-ink'}>{c.label}</span>
                  {!c.done && c.due && <span className="mono ml-auto text-[9.5px] text-ink-faint">{fmtDate(c.due, 'short')}</span>}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function ResearchPanel({ contentId }: { contentId: string }) {
  const ds = useDataset()
  const content = ds.content.find((c) => c.id === contentId)!
  const items = ds.research.filter((r) => content.researchIds.includes(r.id))
  return (
    <div className="space-y-3 p-3.5">
      <p className="text-[11.5px] text-ink-low">
        Attached to <span className="text-ink">{content.title}</span>
      </p>
      {items.length === 0 ? (
        <EmptyState compact icon={<FlaskConical />} title="No research attached" body="Link sources from the Research Hub to ground this piece." />
      ) : (
        items.map((r) => (
          <article key={r.id} className="rounded-lg border border-line-1 bg-white/[0.014] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <Badge tone="cyan" size="xs">
                {r.kind}
              </Badge>
              <span className="mono text-[9.5px] text-ink-faint">{r.code}</span>
            </div>
            <h4 className="mt-1.5 text-[12px] font-medium leading-snug text-ink-hi">{r.title}</h4>
            {r.summary && <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-ink-low">{r.summary}</p>}
          </article>
        ))
      )}
    </div>
  )
}

function TimelinePanel({ contentId }: { contentId: string }) {
  const ds = useDataset()
  const content = ds.content.find((c) => c.id === contentId)!
  const steps = [
    { label: 'Created', at: content.createdAt, done: true },
    ...content.versions
      .slice()
      .reverse()
      .map((v) => ({ label: `${v.label} — ${v.summary}`, at: v.at, done: true })),
    { label: 'Scheduled', at: content.publishDate ?? '', done: !!content.publishDate },
    { label: 'Published', at: content.publishDate ?? '', done: content.status === 'published' },
  ]
  return (
    <ol className="relative space-y-4 p-3.5 pl-6">
      <span className="absolute bottom-4 left-[26px] top-6 w-px bg-line-2" aria-hidden />
      {steps.map((s, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              'absolute -left-[15px] top-1 h-2 w-2 rounded-full border-2 border-deep',
              s.done ? 'bg-accent shadow-[0_0_8px_rgba(91,157,255,0.8)]' : 'bg-ink-ghost',
            )}
            aria-hidden
          />
          <p className={cn('text-[11.5px]', s.done ? 'text-ink' : 'text-ink-faint')}>{s.label}</p>
          {s.at && <p className="mono mt-0.5 text-[9.5px] text-ink-faint">{fmtDate(s.at, 'long')}</p>}
        </li>
      ))}
    </ol>
  )
}

function IdeaDetailPanel({ ideaId }: { ideaId: string }) {
  const ds = useDataset()
  const idea = ds.ideas.find((i) => i.id === ideaId)!
  const cluster = ds.clusters.find((c) => c.id === idea.clusterId)
  const total =
    (idea.scores.audienceRelevance + idea.scores.originality + (6 - idea.scores.effort) + idea.scores.potentialReach + idea.scores.strategicRelevance) / 25
  return (
    <div className="space-y-3.5 p-3.5">
      <div className="flex items-center gap-1.5">
        <Badge tone="violet" size="xs">
          {idea.status}
        </Badge>
        <Badge tone="outline" size="xs" mono>
          {idea.code}
        </Badge>
      </div>
      <h3 className="text-[13.5px] font-semibold leading-snug text-ink-hi">{idea.title}</h3>
      <p className="rounded-lg border border-line-1 bg-white/[0.016] p-2.5 text-[11.5px] italic leading-relaxed text-ink-mid">“{idea.hook}”</p>

      <div className="flex items-center gap-3 rounded-lg border border-line-1 bg-white/[0.016] p-2.5">
        <Ring value={total * 100} size={46} color={total > 0.78 ? '#34D399' : total > 0.6 ? '#FBBF24' : '#FB7185'}>
          <span className="tnum text-[11px] font-semibold text-ink-hi">{Math.round(total * 100)}</span>
        </Ring>
        <div className="min-w-0">
          <p className="text-[11.5px] text-ink-hi">Idea index</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-low">Weighted across relevance, originality, effort and reach.</p>
        </div>
      </div>

      <div className="space-y-2">
        {(
          [
            ['Audience relevance', idea.scores.audienceRelevance],
            ['Originality', idea.scores.originality],
            ['Reach potential', idea.scores.potentialReach],
            ['Strategic fit', idea.scores.strategicRelevance],
            ['Effort (lower is better)', 6 - idea.scores.effort],
          ] as [string, number][]
        ).map(([label, v]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10.5px] text-ink-low">{label}</span>
              <span className="mono text-[10px] text-ink-mid">{v}/5</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={cn('h-1 flex-1 rounded-full', n <= v ? 'bg-accent' : 'bg-white/[0.06]')} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Section title="Cluster" icon={<Tag />}>
        <p className="text-[11.5px] text-ink">{cluster?.name}</p>
        <p className="mt-0.5 text-[10.5px] text-ink-low">{cluster?.description}</p>
      </Section>

      <Section title="Problem" icon={<Target />}>
        <p className="text-[11.5px] leading-relaxed text-ink-mid">{idea.problem}</p>
      </Section>
    </div>
  )
}

function BreakdownPanel({ contentId }: { contentId?: string }) {
  const ds = useDataset()
  const period = resolvePeriod('30d')
  const prevPeriod = { ...period, from: period.prevFrom, to: period.prevTo }
  const content = contentId ? ds.content.find((c) => c.id === contentId) : undefined

  const totals = useMemo(() => {
    if (content) return attributeTotals(ds, [content], period)
    return attributeTotals(ds, scopeContent(ds, useApp.getState().filters, period), period)
  }, [ds, content, period])

  const prev = useMemo(() => {
    if (content) return attributeTotals(ds, [content], prevPeriod)
    return attributeTotals(ds, scopeContent(ds, useApp.getState().filters, prevPeriod), prevPeriod)
  }, [ds, content, prevPeriod])

  const rows: [string, number, number, string][] = [
    ['Views', totals.views, prev.views, 'views'],
    ['Reach', totals.reach, prev.reach, 'reach'],
    ['Engagements', totals.engagements, prev.engagements, 'engagements'],
    ['Watch time', totals.watchMinutes, prev.watchMinutes, 'watchMinutes'],
    ['Followers', totals.followersGained, prev.followersGained, 'followersGained'],
    ['Revenue', totals.revenue, prev.revenue, 'revenue'],
  ]

  return (
    <div className="space-y-3 p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-ink-hi">{content ? content.title : 'Scoped totals'}</p>
          <p className="mono mt-0.5 text-[10px] text-ink-faint">
            {fmtDate(period.from)} → {fmtDate(period.to)} · vs previous {period.days}d
          </p>
        </div>
        {content && <PlatformDot platformId={content.platforms[0]} />}
      </div>

      <ul className="divide-y divide-[var(--color-line-1)] overflow-hidden rounded-lg border border-line-1">
        {rows.map(([label, value, prevValue, metricId]) => {
          const delta = deltaPct(value, prevValue)
          const up = delta >= 0
          return (
            <li key={label} className="flex items-center justify-between gap-3 bg-white/[0.012] px-2.5 py-2">
              <span className="text-[11.5px] text-ink-mid">{label}</span>
              <span className="flex items-baseline gap-2">
                <span className="tnum text-[12px] font-medium text-ink-hi">
                  {metricId === 'watchMinutes' ? fmtDuration(value) : metricId === 'revenue' ? `$${fmtNumber(value)}` : fmtNumber(value)}
                </span>
                <span className={cn('tnum w-[52px] text-right text-[10.5px]', up ? 'text-emerald' : 'text-rose')}>
                  {up ? '+' : '−'}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <div className="rounded-lg border border-line-1 bg-white/[0.016] p-2.5">
        <p className="cell-label mb-1.5">Interpretation</p>
        <p className="text-[11.5px] leading-relaxed text-ink-mid">
          {totals.engagementRate > 8
            ? 'Engagement is running above the account baseline — this shape is worth repeating.'
            : totals.engagementRate > 5
              ? 'Engagement is in line with the account baseline.'
              : 'Engagement is below baseline. Reach arrived but the payoff did not land.'}
        </p>
      </div>
    </div>
  )
}

function DrillPanel() {
  const payload = useApp((s) => s.rightPanelPayload)
  const openPanel = useApp((s) => s.openPanel)
  const ds = useDataset()
  const [level, id] = useMemo(() => {
    if (payload.topicId) return ['topic', payload.topicId] as const
    if (payload.platform) return ['platform', payload.platform] as const
    return ['creator', 'all'] as const
  }, [payload])

  const label = payload.label ?? 'Creator'
  const related =
    level === 'topic'
      ? ds.content.filter((c) => c.topicId === id)
      : level === 'platform'
        ? ds.content.filter((c) => c.platforms.includes(id as never))
        : ds.content

  const sorted = related
    .filter((c) => c.performance)
    .sort((a, b) => (b.performance?.views ?? 0) - (a.performance?.views ?? 0))
    .slice(0, 8)

  return (
    <div className="space-y-3 p-3.5">
      <div className="rounded-lg border border-accent/22 bg-accent/[0.055] p-3">
        <p className="cell-label text-accent/80">Drill level · {level}</p>
        <p className="mt-1 text-[13px] font-semibold text-ink-hi">{label}</p>
        <p className="mono mt-0.5 text-[10px] text-ink-low">
          {related.length} items · {ds.content.filter((c) => c.publishDate).length} published in workspace
        </p>
      </div>

      <Section title="Top content at this level" icon={<Activity />}>
        <ul className="space-y-1.5">
          {sorted.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => openPanel('content', { contentId: c.id })}
                className="group flex w-full items-center gap-2 rounded-lg border border-line-1 bg-white/[0.014] px-2.5 py-2 text-left transition-colors hover:border-line-3 hover:bg-white/[0.03]"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(c.platforms[0]).color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] text-ink">{c.title}</span>
                  <span className="mono block text-[9.5px] text-ink-faint">
                    {fmtNumber(c.performance?.views ?? 0)} views · {statusById(c.status).name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Next drill" icon={<Layers />}>
        <p className="text-[11.5px] leading-relaxed text-ink-low">
          Select a platform in the breakdown chart to descend one level. Drill-through paths:
        </p>
        <ol className="mt-2 space-y-1 text-[11px] text-ink-mid">
          {['Creator', 'Platform', 'Topic', 'Content', 'Performance'].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="mono w-3 text-[9.5px] text-ink-faint">{i + 1}</span>
              <span className={cn(i === 0 && 'text-accent')}>{s}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
function Section({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line-1 bg-white/[0.012] p-2.5">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          {icon && <span className="text-ink-low [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
          <span className="cell-label">{title}</span>
        </span>
        {action}
      </header>
      {children}
    </section>
  )
}

function PlatformDot({ platformId }: { platformId: string }) {
  const p = platformById(platformId as never)
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px]" style={{ color: p.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
      {p.name}
    </span>
  )
}
