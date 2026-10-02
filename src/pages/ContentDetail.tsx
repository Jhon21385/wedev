import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  FlaskConical,
  GitBranch,
  History,
  Layers,
  Link2,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { contentTypeById, formatById, platformById, statusById, METRICS } from '@/data/registry'
import { fmtDate, fmtDateFull, fmtDuration, fmtNumber, fmtRelative, fmtRelativeFuture, relativeDays } from '@/lib/format'
import { topicColor } from '@/analytics/queries'
import { scriptStats } from '@/data/seed/dataset'
import type { Content, ScriptBlock } from '@/data/types'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton, StatusPill } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Segmented, Textarea } from '@/components/ui/Field'
import { Menu, Modal, Popover } from '@/components/ui/Overlay'
import { Thumb } from '@/components/ui/Thumb'
import { Tooltip } from '@/components/ui/Tooltip'
import { MetricTrend, Sparkline } from '@/components/charts/LineArea'
import { RetentionBand } from '@/components/charts/Special'
import { MetricCard } from '@/components/metrics/MetricCard'
import { Page } from '@/components/ui/Page'

/* ============================================================================
   CONTENT DETAIL — the workspace
   One screen that owns the whole life of a piece: brief → script → checklist →
   creative → derivatives → performance. Everything edits in place and autosaves.
   ========================================================================== */

const BLOCK_META: Record<ScriptBlock['kind'], { label: string; color: string; hint: string }> = {
  hook: { label: 'Hook', color: '#FF5A5A', hint: 'First 15 seconds. One promise.' },
  intro: { label: 'Intro', color: '#FBBF24', hint: 'Set the stakes, then move.' },
  section: { label: 'Section', color: '#5B9DFF', hint: 'One idea per section.' },
  example: { label: 'Example', color: '#34D399', hint: 'Concrete, specific, true.' },
  broll: { label: 'B-roll', color: '#38D6F5', hint: 'What the viewer sees.' },
  visual: { label: 'Visual note', color: '#A78BFA', hint: 'Graphics, overlays, on-screen text.' },
  cta: { label: 'CTA', color: '#7C5CF5', hint: 'One ask. Short.' },
  outro: { label: 'Outro', color: '#6A7284', hint: 'Tease the next piece.' },
}

type Tab = 'brief' | 'script' | 'research' | 'creative' | 'performance' | 'derivatives'

export function ContentDetail() {
  const { id } = useParams()
  const ds = useDataset()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const openPanel = useApp((s) => s.openPanel)
  const patchContent = useApp((s) => s.patchContent)
  const updated = useApp((s) => s.updatedContent)
  const settled = useSettled(180)

  const base = ds.content.find((c) => c.id === id)
  const content: Content | undefined = useMemo(() => (base ? { ...base, ...(updated[base.id] ?? {}) } : undefined), [base, updated])

  const [tab, setTab] = useState<Tab>('script')
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const saveTimer = useRef<number | null>(null)
  const firstRender = useRef(true)

  /* Autosave: any local mutation of the brief or script marks the doc dirty,
     then settles. The indicator is honest — it reflects simulated persistence. */
  const touch = () => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveState('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => setSaveState('saved'), 900)
  }

  useEffect(() => {
    firstRender.current = true
  }, [id])

  if (!settled) return <DetailSkeleton />

  if (!content) {
    return (
      <Page width="default">
        <EmptyState
          icon={<FileText />}
          title="That content item no longer exists"
          body="It may have been archived or merged into another piece. The full content graph is one click away."
          actions={
            <Button variant="primary" size="sm" onClick={() => navigate('/content')}>
              Back to content database
            </Button>
          }
        />
      </Page>
    )
  }

  const status = statusById(content.status)
  const type = contentTypeById(content.typeId)
  const stats = scriptStats(content.script)
  const doneChecks = content.checklist.filter((c) => c.done).length
  const derivatives = ds.content.filter((c) => c.parentId === content.id)
  const source = content.parentId ? ds.content.find((c) => c.id === content.parentId) : undefined
  const research = ds.research.filter((r) => content.researchIds.includes(r.id))
  const assets = ds.assets.filter((a) => content.assetIds.includes(a.id))
  const series = ds.series.find((s) => s.id === content.seriesId)
  const campaign = ds.campaigns.find((c) => c.id === content.campaignId)
  const perf = content.performance
  const seriesPoints = ds.contentSeries[content.id] ?? []
  const daysToDeadline = relativeDays(content.deadline)
  const overdue = daysToDeadline !== null && daysToDeadline < 0 && !['published', 'archived'].includes(content.status)

  const setStatus = (next: string) => {
    patchContent(content.id, { status: next as Content['status'] })
    pushToast({
      kind: 'success',
      title: `Moved to ${statusById(next).name}`,
      body:
        next === 'published'
          ? 'Performance tracking started. Derivative suggestions are queued.'
          : `Downstream stages updated. ${content.derivativeIds.length} derivative${content.derivativeIds.length === 1 ? '' : 's'} linked.`,
      action: { label: 'Undo', run: () => patchContent(content.id, { status: content.status }) },
    })
  }

  return (
    <Page width="wide">
      {/* ================================================================== */}
      {/* HEADER                                                              */}
      {/* ================================================================== */}
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] text-ink-low transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Content
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3.5">
            <span className="hidden h-[62px] w-[104px] shrink-0 overflow-hidden rounded-lg border border-line-2 sm:block">
              <Thumb seed={content.thumbnailSeed} accent={platformById(content.platforms[0]).color} aspect="auto" className="h-full w-full" compact />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill name={status.name} color={status.accent} />
                <Badge tone="outline" size="xs" mono>
                  {content.code}
                </Badge>
                <Badge tone={content.priority === 'critical' ? 'danger' : content.priority === 'high' ? 'warn' : 'neutral'} size="xs">
                  {content.priority} priority
                </Badge>
                {overdue && (
                  <Badge tone="danger" size="xs">
                    <AlertTriangle className="h-2.5 w-2.5" /> {Math.abs(daysToDeadline!)}d overdue
                  </Badge>
                )}
              </div>
              <h1 className="mt-2 max-w-[70ch] text-[20px] font-semibold leading-tight tracking-[-0.022em] text-ink-hi">{content.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-low">
                <span className="flex items-center gap-1.5">
                  {content.platforms.map((p) => (
                    <span key={p} className="font-medium" style={{ color: platformById(p).color }}>
                      {platformById(p).name}
                    </span>
                  ))}
                </span>
                <span className="text-ink-ghost">·</span>
                <span>{type.name}</span>
                <span className="text-ink-ghost">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: topicColor(ds, content.topicId) }} />
                  {ds.topics.find((t) => t.id === content.topicId)?.name}
                </span>
                {series && (
                  <>
                    <span className="text-ink-ghost">·</span>
                    <span>{series.name}</span>
                  </>
                )}
                {campaign && (
                  <>
                    <span className="text-ink-ghost">·</span>
                    <span style={{ color: campaign.color }}>{campaign.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1.5 text-[10.5px] text-ink-faint" aria-live="polite">
              {saveState === 'saving' ? (
                <>
                  <Save className="h-3 w-3 animate-pulse text-amber" /> Saving…
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald" /> Saved {fmtRelative(content.updatedAt + 'T09:00:00')}
                </>
              )}
            </span>
            <Segmented
              ariaLabel="Set status"
              size="sm"
              value={content.status}
              onChange={setStatus}
              options={['idea', 'research', 'brief', 'scripting', 'production', 'editing', 'review', 'ready', 'scheduled', 'published'].map((s) => ({
                id: s,
                label: statusById(s).name,
              }))}
            />
            <Popover
              align="end"
              width={230}
              trigger={({ toggle }) => <IconButton label="More actions" icon={<MoreHorizontal />} onClick={toggle} side="left" />}
            >
              {(close) => (
                <Menu
                  items={[
                    { id: 'duplicate', label: 'Duplicate as new idea', icon: <Copy />, onSelect: () => { pushToast({ kind: 'success', title: 'Duplicated', body: 'A copy now sits in the Idea stage.' }); close() } },
                    { id: 'derivative', label: 'Create derivative', icon: <GitBranch />, onSelect: () => { setTab('derivatives'); close() } },
                    { id: 'schedule', label: 'Reschedule', icon: <Clock />, onSelect: () => { setPublishOpen(true); close() } },
                    { id: 'panel', label: 'Open in side panel', icon: <Layers />, onSelect: () => { openPanel('content', { contentId: content.id }); close() } },
                    { id: 'archive', label: 'Archive', icon: <Trash2 />, danger: true, separatorBefore: true, onSelect: () => { setStatus('archived'); close() } },
                  ]}
                />
              )}
            </Popover>
            <Button variant="primary" size="md" icon={<Rocket />} onClick={() => setPublishOpen(true)}>
              {content.status === 'published' ? 'Published' : 'Publish'}
            </Button>
          </div>
        </div>

        {/* --- quick facts strip ---------------------------------------- */}
        <div className="mt-4 grid divide-x divide-[var(--color-line-1)] overflow-hidden rounded-xl border border-line-2 bg-panel sm:grid-cols-3 lg:grid-cols-6">
          <QuickFact label="Published" value={content.publishDate ? fmtDate(content.publishDate, 'long') : 'Not yet'} />
          <QuickFact label="Deadline" value={content.deadline ? fmtRelativeFuture(content.deadline) : 'None'} tone={overdue ? 'risk' : daysToDeadline !== null && daysToDeadline <= 3 ? 'warn' : 'normal'} />
          <QuickFact label="Script" value={`${fmtNumber(stats.words)} words`} hint={`~${stats.minutes.toFixed(1)} min runtime`} />
          <QuickFact label="Checklist" value={`${doneChecks} / ${content.checklist.length}`} hint={`${Math.round((doneChecks / content.checklist.length) * 100)}% complete`} />
          <QuickFact label="Effort" value={`${content.effortHours} hrs`} hint="logged production time" />
          <QuickFact label="Derivatives" value={`${derivatives.length}`} hint={derivatives.length ? 'repurposed assets' : 'none yet'} />
        </div>
      </div>

      {/* ================================================================== */}
      {/* BODY                                                                */}
      {/* ================================================================== */}
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0">
          <Segmented
            ariaLabel="Content sections"
            size="md"
            className="mb-3.5"
            value={tab}
            onChange={setTab}
            options={[
              { id: 'brief', label: <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Brief</span> },
              { id: 'script', label: <span className="inline-flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" /> Script</span> },
              { id: 'research', label: <span className="inline-flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Research <span className="mono text-[9.5px] text-ink-faint">{research.length}</span></span> },
              { id: 'creative', label: <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Creative <span className="mono text-[9.5px] text-ink-faint">{assets.length}</span></span> },
              { id: 'derivatives', label: <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Repurpose <span className="mono text-[9.5px] text-ink-faint">{derivatives.length}</span></span> },
              { id: 'performance', label: <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Performance</span> },
            ]}
          />

          {tab === 'brief' && <BriefTab content={content} onEdit={touch} />}
          {tab === 'script' && <ScriptTab content={content} onEdit={touch} onHistory={() => setVersionsOpen(true)} stats={stats} />}
          {tab === 'research' && <ResearchTab content={content} />}
          {tab === 'creative' && <CreativeTab content={content} />}
          {tab === 'derivatives' && <DerivativesTab content={content} source={source} derivatives={derivatives} />}
          {tab === 'performance' && <PerformanceTab content={content} seriesPoints={seriesPoints} perf={perf} />}
        </div>

        {/* --- right rail ------------------------------------------------- */}
        <div className="space-y-3.5">
          <Panel className="overflow-hidden">
            <PanelHeader dense icon={<ListChecks />} title="Production checklist" subtitle={`${doneChecks} of ${content.checklist.length} complete`} />
            <div className="p-3">
              <Progress value={doneChecks} max={content.checklist.length} color={doneChecks === content.checklist.length ? '#34D399' : 'var(--color-accent)'} />
              <ul className="mt-3 space-y-0.5">
                {content.checklist.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        const next = content.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x))
                        patchContent(content.id, { checklist: next })
                        touch()
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.035]"
                    >
                      <span
                        className={cn(
                          'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors',
                          c.done ? 'border-emerald/45 bg-emerald/15' : 'border-line-3 hover:border-line-4',
                        )}
                      >
                        {c.done && <CheckCircle2 className="h-3 w-3 text-emerald" />}
                      </span>
                      <span className={cn('flex-1 text-[11.5px]', c.done ? 'text-ink-low line-through decoration-line-3' : 'text-ink')}>{c.label}</span>
                      <span className="mono text-[9px] text-ink-ghost">{c.group}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader dense icon={<Tag />} title="Properties" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 p-3.5">
              <KeyValue label="Type" value={type.name} hint={type.custom ? 'custom type' : 'native'} />
              <KeyValue label="Format" value={formatById(content.format).name} />
              <KeyValue label="Topic" value={ds.topics.find((t) => t.id === content.topicId)?.name ?? '—'} />
              <KeyValue label="Series" value={series?.name ?? '—'} />
              <KeyValue label="Campaign" value={campaign?.name ?? '—'} />
              <KeyValue label="Created" value={fmtDate(content.createdAt, 'long')} mono />
              <KeyValue label="Updated" value={fmtDate(content.updatedAt, 'long')} mono />
              <KeyValue label="Versions" value={`${content.versions.length} saved`} />
            </div>
            <div className="border-t border-line-1 p-3">
              <p className="cell-label mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {content.tags.map((t) => (
                  <Badge key={t} tone="outline" size="xs">
                    {t}
                  </Badge>
                ))}
                <button className="inline-flex h-5 items-center gap-1 rounded-md border border-dashed border-line-3 px-1.5 text-[10px] text-ink-faint transition-colors hover:border-line-4 hover:text-ink">
                  <Plus className="h-2.5 w-2.5" /> tag
                </button>
              </div>
            </div>
            {content.customFields && Object.keys(content.customFields).length > 0 && (
              <div className="border-t border-line-1 p-3">
                <p className="cell-label mb-2">Custom fields</p>
                <div className="space-y-2">
                  {type.fields.map((f) => (
                    <KeyValue key={f.id} label={f.label} value={String(content.customFields?.[f.id] ?? '—')} mono />
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader dense icon={<History />} title="Timeline" actions={<Button size="xs" variant="ghost" onClick={() => setVersionsOpen(true)}>Versions</Button>} />
            <ol className="relative space-y-3 p-3.5 pl-6">
              <span className="absolute bottom-3 left-[19px] top-5 w-px bg-line-2" aria-hidden />
              {[
                { label: 'Created', at: content.createdAt },
                ...content.versions.slice().reverse().map((v) => ({ label: `${v.label} · ${v.summary}`, at: v.at })),
                ...(content.publishDate ? [{ label: 'Published', at: content.publishDate }] : []),
              ].map((s, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full border-2 border-panel', i === 0 ? 'bg-ink-ghost' : 'bg-accent')} aria-hidden />
                  <p className="text-[11px] leading-snug text-ink-mid">{s.label}</p>
                  <p className="mono mt-0.5 text-[9.5px] text-ink-faint">{fmtDate(s.at, 'long')}</p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel glow={1} className="relative overflow-hidden">
            <div className="grid-etch p-3.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-accent-ink">
                <Sparkles className="h-3.5 w-3.5" /> Contextual intelligence
              </p>
              <ul className="mt-2.5 space-y-2">
                {intelligence(ds, content, stats, perf).map((n, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-ink-mid">
                    <span className="text-ink-hi">{n.lead}</span> {n.body}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </div>

      {/* --- version history modal --------------------------------------- */}
      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Version history"
        description="Every save is recoverable. Script length and structure changes are summarised per revision."
        size="lg"
      >
        <ol className="space-y-2">
          {content.versions.map((v) => (
            <li key={v.id} className={cn('rounded-xl border p-3', v.current ? 'border-accent/30 bg-accent/[0.055]' : 'border-line-2 bg-white/[0.014]')}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="mono text-[11.5px] font-semibold text-ink-hi">{v.label}</span>
                  {v.current && <Badge tone="accent" size="xs">current</Badge>}
                  <span className="text-[11px] text-ink-low">{v.author}</span>
                </div>
                <span className="mono text-[10px] text-ink-faint">{fmtDateFull(v.at)}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mid">{v.summary}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="mono text-[10px] text-ink-faint">{fmtNumber(v.words)} words</span>
                <span className="mono text-[10px] text-ink-faint">~{(v.words / 155).toFixed(1)} min</span>
                <Button size="xs" variant="ghost" className="ml-auto" onClick={() => pushToast({ kind: 'info', title: `Restoring ${v.label}`, body: 'A new revision will be created on top of the current one.' })}>
                  Restore
                </Button>
              </div>
            </li>
          ))}
          {!content.versions.length && <EmptyState compact title="No revisions yet" body="Versions appear as soon as the script leaves the idea stage." />}
        </ol>
      </Modal>

      {/* --- publish modal ------------------------------------------------ */}
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} content={content} onConfirm={(date, time) => {
        patchContent(content.id, { publishDate: date, status: 'scheduled' })
        pushToast({
          kind: 'success',
          title: 'Scheduled',
          body: `Publishing ${fmtDate(date, 'long')} at ${time}. Derivatives will be queued for review.`,
        })
        setPublishOpen(false)
      }} />
    </Page>
  )
}

/* ============================================================================
   TABS
   ========================================================================== */
function BriefTab({ content, onEdit }: { content: Content; onEdit: () => void }) {
  const ds = useDataset()
  const [draft, setDraft] = useState(content.brief)
  useEffect(() => setDraft(content.brief), [content.brief])

  const field = (key: keyof typeof draft, label: string, hint: string, rows = 3) => (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="cell-label">{label}</span>
        <span className="text-[10px] text-ink-faint">{hint}</span>
      </div>
      <Textarea
        rows={rows}
        value={String(draft[key] ?? '')}
        onChange={(e) => {
          setDraft({ ...draft, [key]: e.target.value })
          onEdit()
        }}
        className="text-[12.5px] leading-relaxed"
      />
    </div>
  )

  return (
    <div className="space-y-3.5">
      <Panel>
        <PanelHeader icon={<Target />} title="Content brief" subtitle="The five sentences that stop a video becoming vague." />
        <div className="space-y-3.5 p-4">
          {field('objective', 'Objective', 'one sentence, measurable')}
          {field('audience', 'Target audience', 'who exactly')}
          {field('coreMessage', 'Core message', 'the one thing worth remembering')}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {field('hook', 'Hook', 'first 15 seconds', 4)}
            {field('cta', 'Call to action', 'one ask only', 4)}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Panel>
          <PanelHeader dense icon={<Layers />} title="Key points" subtitle="The spine of the argument" />
          <ol className="divide-y divide-[var(--color-line-1)]">
            {content.brief.keyPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-3 px-3.5 py-2.5">
                <span className="mono mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line-2 bg-white/[0.03] text-[10px] text-ink-low">{i + 1}</span>
                <span className="text-[12px] leading-relaxed text-ink">{p}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <PanelHeader dense icon={<Tag />} title="Keywords & SEO" subtitle="Topic signal for search and recommendation" />
          <div className="p-3.5">
            <div className="flex flex-wrap gap-1.5">
              {content.brief.keywords.map((k) => (
                <Badge key={k} tone="cyan" size="sm">
                  {k}
                </Badge>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-line-1 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-ink-mid">Related content in this topic</span>
                <span className="mono text-[10px] text-ink-faint">
                  {ds.content.filter((c) => c.topicId === content.topicId && c.id !== content.id).length}
                </span>
              </div>
              <ul className="space-y-1">
                {ds.content
                  .filter((c) => c.topicId === content.topicId && c.id !== content.id)
                  .slice(0, 4)
                  .map((c) => (
                    <li key={c.id}>
                      <Link to={`/content/${c.id}`} className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.035]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(c.platforms[0]).color }} />
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{c.title}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-ghost transition-colors group-hover:text-accent" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ScriptTab({
  content,
  onEdit,
  onHistory,
  stats,
}: {
  content: Content
  onEdit: () => void
  onHistory: () => void
  stats: { words: number; minutes: number; readingTime: number; blocks: number }
}) {
  const patchContent = useApp((s) => s.patchContent)
  const [focusBlock, setFocusBlock] = useState<string | null>(null)

  const updateBlock = (id: string, patch: Partial<ScriptBlock>) => {
    const next = content.script.map((b) => (b.id === id ? { ...b, ...patch } : b))
    patchContent(content.id, { script: next })
    onEdit()
  }

  const addBlock = (kind: ScriptBlock['kind']) => {
    const block: ScriptBlock = { id: `sb-${Date.now()}`, kind, title: BLOCK_META[kind].label, body: '' }
    patchContent(content.id, { script: [...content.script, block] })
    onEdit()
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        icon={<Wand2 />}
        title="Script"
        subtitle={`${content.script.length} blocks · ${content.brief.coreMessage.slice(0, 62)}${content.brief.coreMessage.length > 62 ? '…' : ''}`}
        actions={
          <>
            <Badge tone="outline" size="xs" mono>
              {fmtNumber(stats.words)} words
            </Badge>
            <Badge tone="accent" size="xs" mono>
              ~{stats.minutes.toFixed(1)} min runtime
            </Badge>
            <Badge tone="neutral" size="xs" mono>
              {stats.readingTime} min read
            </Badge>
            <Tooltip content="Version history" side="bottom">
              <IconButton label="Version history" icon={<History />} onClick={onHistory} />
            </Tooltip>
          </>
        }
      />

      <div className="divide-y divide-[var(--color-line-1)]">
        {content.script.map((block, i) => {
          const meta = BLOCK_META[block.kind]
          const focused = focusBlock === block.id
          return (
            <article
              key={block.id}
              className={cn('group relative px-4 py-3.5 transition-colors duration-200', focused && 'bg-accent/[0.035]')}
            >
              <span className="absolute bottom-4 left-0 top-4 w-[2px] rounded-full" style={{ background: meta.color, opacity: 0.55 }} aria-hidden />
              <div className="mb-2 flex items-center justify-between gap-3 pl-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="mono text-[10px] text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                  <Badge size="xs" style={{ background: `${meta.color}1F`, color: meta.color, borderColor: `${meta.color}3D` }}>
                    {meta.label}
                  </Badge>
                  <span className="truncate text-[11px] text-ink-faint">{meta.hint}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <IconButton label="Duplicate block" icon={<Copy />} size="xs" onClick={() => {
                    const idx = content.script.findIndex((b) => b.id === block.id)
                    const next = [...content.script]
                    next.splice(idx + 1, 0, { ...block, id: `sb-${Date.now()}` })
                    patchContent(content.id, { script: next })
                    onEdit()
                  }} />
                  <IconButton label="Remove block" icon={<Trash2 />} size="xs" onClick={() => {
                    patchContent(content.id, { script: content.script.filter((b) => b.id !== block.id) })
                    onEdit()
                  }} />
                </div>
              </div>

              <div className="pl-3">
                <input
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  onFocus={() => setFocusBlock(block.id)}
                  onBlur={() => setFocusBlock(null)}
                  className="w-full bg-transparent text-[13.5px] font-semibold tracking-[-0.012em] text-ink-hi focus:outline-none"
                  aria-label={`Block ${i + 1} title`}
                />
                <textarea
                  value={block.body}
                  onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                  onFocus={() => setFocusBlock(block.id)}
                  onBlur={() => setFocusBlock(null)}
                  rows={Math.max(2, Math.min(9, Math.ceil(block.body.length / 92)))}
                  placeholder="Write the beat…"
                  className={cn(
                    'mt-2 w-full max-w-[74ch] resize-none bg-transparent text-[13.5px] leading-[1.72] text-ink',
                    'tracking-[-0.003em] placeholder:text-ink-ghost transition-colors duration-[var(--duration-2)] focus:outline-none',
                    focusBlock === block.id ? 'text-ink-hi' : 'text-ink',
                  )}
                  aria-label={`Block ${i + 1} body`}
                />
                {block.note && (
                  <p className="mt-2 flex items-start gap-2 rounded-md border border-amber/20 bg-amber/[0.055] px-2.5 py-1.5 text-[11px] leading-relaxed text-amber/90">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                    {block.note}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <span className="mono text-[9.5px] text-ink-ghost">
                    {block.body.split(/\s+/).filter(Boolean).length} words · ~{(block.body.split(/\s+/).filter(Boolean).length / 155 * 60).toFixed(0)}s
                  </span>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line-2 bg-white/[0.012] p-3">
        <span className="cell-label mr-1.5">Add block</span>
        {(Object.keys(BLOCK_META) as ScriptBlock['kind'][]).map((k) => (
          <button
            key={k}
            onClick={() => addBlock(k)}
            className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line-2 px-2 text-[10.5px] text-ink-mid transition-all duration-200 hover:border-line-3 hover:bg-white/[0.04] hover:text-ink-hi"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: BLOCK_META[k].color }} />
            {BLOCK_META[k].label}
          </button>
        ))}
      </div>
    </Panel>
  )
}

function ResearchTab({ content }: { content: Content }) {
  const ds = useDataset()
  const items = ds.research.filter((r) => content.researchIds.includes(r.id))
  const linked = ds.content.filter((c) => c.researchIds.some((id) => content.researchIds.includes(id)) && c.id !== content.id)

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <Panel className="overflow-hidden lg:col-span-2">
        <PanelHeader icon={<FlaskConical />} title="Attached research" subtitle="Sources, statistics and notes grounding this piece" actions={<Button size="xs" variant="secondary" icon={<Plus />} onClick={() => useApp.getState().pushToast({ kind: 'info', title: 'Link research', body: 'Search the Research Hub to attach a source.' })}>Link</Button>} />
        {items.length === 0 ? (
          <EmptyState
            icon={<FlaskConical />}
            title="No research attached yet"
            body="Every claim in the script should trace back to a source. Attach from the Research Hub and it appears here."
            actions={<Button size="sm" variant="primary" onClick={() => useApp.getState().pushToast({ kind: 'info', title: 'Opening Research Hub' })}>Open Research Hub</Button>}
          />
        ) : (
          <ul className="divide-y divide-[var(--color-line-1)]">
            {items.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <Badge tone="cyan" size="xs" className="mt-0.5">
                  {r.kind}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium leading-snug text-ink-hi">{r.title}</p>
                  {r.summary && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-low">{r.summary}</p>}
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <span className="mono text-[9.5px] text-ink-faint">{r.code}</span>
                    <span className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={cn('h-1 w-3 rounded-full', i < r.credibility ? 'bg-accent' : 'bg-white/[0.07]')} />
                      ))}
                    </span>
                    <span className="text-[10px] text-ink-faint">confidence</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader dense icon={<Link2 />} title="Shared sources" subtitle="Other pieces citing the same research" />
        {linked.length ? (
          <ul className="divide-y divide-[var(--color-line-1)]">
            {linked.map((c) => (
              <li key={c.id}>
                <Link to={`/content/${c.id}`} className="group flex items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-white/[0.028]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(c.platforms[0]).color }} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{c.title}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-ghost transition-colors group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-[11.5px] text-ink-low">No other content cites these sources yet.</p>
        )}
      </Panel>

      <Panel>
        <PanelHeader dense icon={<MessageSquare />} title="Working notes" />
        <div className="p-3.5">
          <Textarea rows={7} defaultValue={content.notes || 'Add production notes, client feedback, or constraints…'} className="text-[12px]" />
        </div>
      </Panel>
    </div>
  )
}

function CreativeTab({ content }: { content: Content }) {
  const ds = useDataset()
  const assets = ds.assets.filter((a) => content.assetIds.includes(a.id))
  const thumbnails = assets.filter((a) => a.kind === 'thumbnail')
  const others = assets.filter((a) => a.kind !== 'thumbnail')

  return (
    <div className="space-y-3.5">
      <Panel>
        <PanelHeader icon={<Layers />} title="Thumbnail" subtitle="One face, one object, three words maximum" actions={<Button size="xs" variant="secondary" icon={<Plus />}>New variant</Button>} />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(thumbnails.length ? thumbnails : []).map((a) => (
            <figure key={a.id} className="group overflow-hidden rounded-lg border border-line-2 bg-white/[0.014]">
              <div className="relative">
                <Thumb seed={a.seed} accent={platformById(content.platforms[0]).color} aspect="16/9" />
                <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-md">
                  <span className="mono text-[9px] text-ink-mid">1280×720</span>
                </span>
              </div>
              <figcaption className="p-2.5">
                <p className="truncate text-[11px] text-ink-hi">{a.name}</p>
                <p className="mono mt-0.5 text-[9.5px] text-ink-faint">{a.tags.join(' · ')}</p>
              </figcaption>
            </figure>
          ))}
          {!thumbnails.length && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState compact icon={<Layers />} title="No thumbnail yet" body="Upload a variant or pick a template from the Brand system." />
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader dense icon={<Paperclip />} title="Attached assets" subtitle={`${others.length} files linked to this piece`} />
        <ul className="divide-y divide-[var(--color-line-1)]">
          {others.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line-2 bg-white/[0.03]">
                <FileText className="h-3.5 w-3.5 text-ink-low" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] text-ink-hi">{a.name}</span>
                <span className="mono block truncate text-[9.5px] text-ink-faint">
                  {a.kind} · {a.folder}
                </span>
              </span>
              <span className="mono shrink-0 text-[10px] text-ink-faint">{(a.size / 1e6).toFixed(1)} MB</span>
            </li>
          ))}
          {!others.length && (
            <li className="px-4">
              <EmptyState compact icon={<Paperclip />} title="Nothing attached" body="B-roll, diagrams and audio linked here keep the edit self-contained." />
            </li>
          )}
        </ul>
      </Panel>
    </div>
  )
}

function DerivativesTab({ content, source, derivatives }: { content: Content; source?: Content; derivatives: Content[] }) {
  const ds = useDataset()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)

  const chain = [source, content, ...derivatives].filter(Boolean) as Content[]

  return (
    <div className="space-y-3.5">
      <Panel glow={2} className="overflow-hidden">
        <div className="grid-etch">
          <PanelHeader
            icon={<GitBranch />}
            title="Repurposing chain"
            subtitle="One idea, many surfaces — each derivative is its own content object with its own analytics"
            actions={<Button size="xs" variant="accent-soft" icon={<Plus />} onClick={() => pushToast({ kind: 'success', title: 'Derivative drafted', body: 'A new Reel was created and linked to this piece.' })}>Create derivative</Button>}
          />
          <div className="overflow-x-auto p-4">
            <ol className="flex min-w-[640px] items-stretch gap-2">
              {chain.map((item, i) => {
                const isSelf = item.id === content.id
                const perf = item.performance
                return (
                  <li key={item.id} className="flex min-w-0 flex-1 items-center">
                    <button
                      onClick={() => navigate(`/content/${item.id}`)}
                      className={cn(
                        'group flex min-w-0 flex-1 flex-col rounded-lg border p-2.5 text-left transition-all duration-250',
                        isSelf ? 'border-accent/40 bg-accent/[0.06] glow-1' : 'border-line-2 bg-white/[0.014] hover:border-line-3 hover:bg-white/[0.035]',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformById(item.platforms[0]).color, boxShadow: `0 0 6px ${platformById(item.platforms[0]).color}` }} />
                        <span className="truncate text-[10px] font-medium uppercase tracking-[0.05em] text-ink-mid">{platformById(item.platforms[0]).name}</span>
                      </span>
                      <span className="mt-1.5 line-clamp-2 text-[11.5px] font-medium leading-snug text-ink-hi">{item.title}</span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <StatusPill name={statusById(item.status).name} color={statusById(item.status).accent} className="text-[9.5px]" />
                        {perf && <span className="mono text-[9.5px] text-ink-faint">{fmtNumber(perf.views, { compact: true })}</span>}
                      </span>
                    </button>
                    {i < chain.length - 1 && <ChevronDown className="mx-1 h-3.5 w-3.5 shrink-0 -rotate-90 text-ink-ghost" aria-hidden />}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader dense icon={<Zap />} title="Suggested derivatives" subtitle="Formats that historically outperform from this topic" />
        <ul className="divide-y divide-[var(--color-line-1)]">
          {suggestions(ds, content, derivatives).map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border" style={{ borderColor: `${s.color}44`, background: `${s.color}16` }}>
                <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] text-ink-hi">{s.label}</span>
                <span className="block text-[10.5px] text-ink-low">{s.reason}</span>
              </span>
              <Button size="xs" variant="ghost" icon={<Plus />} onClick={() => pushToast({ kind: 'success', title: `${s.label} drafted`, body: 'Added to the derivative queue with a starter script skeleton.' })}>
                Draft
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function PerformanceTab({
  content,
  seriesPoints,
  perf,
}: {
  content: Content
  seriesPoints: { date: string; views: number; reach: number; engagements: number; watchMinutes: number; followersGained: number }[]
  perf?: Content['performance']
}) {
  if (!perf || !seriesPoints.length) {
    return (
      <Panel>
        <EmptyState
          icon={<BarChart3 />}
          title={content.status === 'published' ? 'Performance data is still arriving' : 'Not published yet'}
          body="Once this piece is live, views, retention, watch time and follower attribution appear here — connected back to this exact content object."
          actions={<Button size="sm" variant="secondary" onClick={() => useApp.getState().pushToast({ kind: 'info', title: 'Publishing checklist opened' })}>Open publish checklist</Button>}
        />
      </Panel>
    )
  }

  const rows = seriesPoints.map((p) => ({
    date: p.date,
    label: fmtDate(p.date, 'short'),
    views: p.views,
    reach: p.reach,
    engagements: p.engagements,
    watchMinutes: p.watchMinutes,
    followersGained: p.followersGained,
    revenue: 0,
    impressions: 0,
    engagementRate: p.reach ? (p.engagements / p.reach) * 100 : 0,
    followers: 0,
    clicks: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
  }))

  const peak = seriesPoints.reduce((a, b) => (b.views > a.views ? b : a), seriesPoints[0])

  return (
    <div className="space-y-3.5">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard metricId="views" value={perf.views} context="lifetime" spark={seriesPoints.map((p) => p.views)} />
        <MetricCard metricId="reach" value={perf.reach} context={`${((perf.reach / perf.views) * 100).toFixed(0)}% of views`} />
        <MetricCard metricId="engagementRate" value={(perf.engagements / perf.reach) * 100} context={`${fmtNumber(perf.engagements)} engagements`} />
        <MetricCard metricId="followersGained" value={perf.followersGained} context="attributed follows" color="#34D399" />
      </div>

      <Panel>
        <PanelHeader
          icon={<BarChart3 />}
          title="Views over time"
          subtitle={`Peak day ${fmtDate(peak.date, 'long')} · ${fmtNumber(peak.views)} views`}
          actions={
            <div className="flex items-center gap-1.5">
              <Badge tone="outline" size="xs" mono>
                {fmtDuration(perf.watchMinutes)} watched
              </Badge>
              <Badge tone="outline" size="xs" mono>
                {perf.retention}% retention
              </Badge>
            </div>
          }
        />
        <div className="p-4">
          <MetricTrend rows={rows} series={[{ id: 'views', type: 'area' }, { id: 'reach', type: 'line', axis: 'right' }]} mode="line" height={230} />
        </div>
      </Panel>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Panel>
          <PanelHeader dense icon={<Target />} title="Audience retention" subtitle="Average across all viewers, with best and worst decile" />
          <div className="p-4">
            <RetentionBand points={perf.retentionCurve.map((v, i, arr) => ({ pct: Math.round(((i + 0.5) / arr.length) * 100), value: v, best: v + 6, worst: Math.max(3, v - 9) }))} height={190} />
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line-1 pt-3">
              <KeyValue label="Hook (first 30s)" value={`${perf.retentionCurve[1]}%`} hint="retained" />
              <KeyValue label="Midpoint" value={`${perf.retentionCurve[Math.floor(perf.retentionCurve.length / 2)]}%`} hint="retained" />
              <KeyValue label="Completion" value={`${perf.retentionCurve[perf.retentionCurve.length - 1]}%`} hint="to the end" />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader dense icon={<Layers />} title="Engagement breakdown" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-4">
            <KeyValue label="Likes" value={fmtNumber(perf.likes)} mono />
            <KeyValue label="Comments" value={fmtNumber(perf.comments)} mono />
            <KeyValue label="Shares" value={fmtNumber(perf.shares)} mono />
            <KeyValue label="Saves" value={fmtNumber(perf.saves)} mono />
            <KeyValue label="Link clicks" value={fmtNumber(perf.clicks)} mono />
            <KeyValue label="Revenue" value={`$${perf.revenue.toFixed(2)}`} mono />
          </div>
          <div className="border-t border-line-1 p-3.5">
            <ShareBreakdown perf={perf} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ShareBreakdown({ perf }: { perf: NonNullable<Content['performance']> }) {
  const total = perf.likes + perf.comments + perf.shares + perf.saves || 1
  const parts = [
    { label: 'Likes', value: perf.likes, color: '#5B9DFF' },
    { label: 'Comments', value: perf.comments, color: '#A78BFA' },
    { label: 'Shares', value: perf.shares, color: '#34D399' },
    { label: 'Saves', value: perf.saves, color: '#FBBF24' },
  ]
  return (
    <div>
      <p className="cell-label mb-2">Signal mix</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            <span className="text-[10.5px] text-ink-mid">{p.label}</span>
            <span className="tnum text-[10.5px] text-ink-faint">{((p.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ============================================================================
   PUBLISH MODAL
   ========================================================================== */
function PublishModal({
  open,
  onClose,
  content,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  content: Content
  onConfirm: (date: string, time: string) => void
}) {
  const ds = useDataset()
  const [date, setDate] = useState(content.publishDate ?? ds.todayKey)
  const [time, setTime] = useState('18:30')
  const done = content.checklist.filter((c) => c.done).length
  const blockers = content.checklist.filter((c) => !c.done && ['publish', 'post'].includes(c.group))

  useEffect(() => {
    if (open) setDate(content.publishDate ?? ds.todayKey)
  }, [open, content.publishDate, ds.todayKey])

  const bestSlots = ['Tue 18:30', 'Thu 19:00', 'Sat 11:00']

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish & schedule"
      description="Publishing creates the performance object, queues derivative review and starts attribution."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Rocket />} onClick={() => onConfirm(date, time)}>
            {new Date(date) <= new Date(ds.todayKey) ? 'Publish now' : 'Schedule'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="cell-label mb-1.5 block">Publish date</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="cell-label mb-1.5 block">Time</span>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <div className="rounded-lg border border-line-2 bg-white/[0.016] p-3">
          <p className="cell-label mb-2">Best performing slots for your audience</p>
          <div className="flex flex-wrap gap-1.5">
            {bestSlots.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setTime(s.split(' ')[1])
                }}
                className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line-2 px-2 text-[11px] text-ink-mid transition-colors hover:border-accent/40 hover:text-accent-ink"
              >
                <Clock className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="cell-label">Pre-publish readiness</span>
            <span className="mono text-[10.5px] text-ink-mid">
              {done}/{content.checklist.length}
            </span>
          </div>
          <Progress value={done} max={content.checklist.length} color={blockers.length ? '#FBBF24' : '#34D399'} />
          {blockers.length > 0 ? (
            <ul className="mt-2.5 space-y-1">
              {blockers.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-[11.5px] text-amber">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {b.label} is not complete
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 flex items-center gap-2 text-[11.5px] text-emerald">
              <Check className="h-3.5 w-3.5" /> All publish-stage checks are complete.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-line-2 bg-white/[0.016] p-3">
          <p className="cell-label mb-2">On publish</p>
          <ul className="space-y-1.5">
            {[
              'Performance tracking starts at the first impression',
              'Derivative suggestions are queued for review',
              `${METRICS.length} metrics attributed back to this content object`,
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-[11.5px] text-ink-mid">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}

/* ============================================================================
   HELPERS
   ========================================================================== */
function QuickFact({ label, value, hint, tone = 'normal' }: { label: string; value: string; hint?: string; tone?: 'normal' | 'warn' | 'risk' }) {
  return (
    <div className="min-w-0 px-3.5 py-2.5">
      <p className="cell-label">{label}</p>
      <p className={cn('mt-1 truncate text-[12.5px] font-medium', tone === 'risk' ? 'text-rose' : tone === 'warn' ? 'text-amber' : 'text-ink-hi')}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-ink-faint">{hint}</p>}
    </div>
  )
}

function suggestions(ds: ReturnType<typeof useDataset>, content: Content, derivatives: Content[]) {
  const existing = new Set(derivatives.map((d) => d.typeId))
  const pool = [
    { id: 'yt-short', label: 'Cut a 45-second Short', reason: 'Shorts from this topic average 2.4× the channel median.', color: '#FF5A5A', icon: Zap },
    { id: 'ig-reel', label: 'Reformat as an Instagram Reel', reason: 'Reels on this topic hold 62% retention.', color: '#D976FF', icon: Layers },
    { id: 'ig-carousel', label: 'Build a 9-slide carousel', reason: 'Carousels on this topic save 3.1× more than text.', color: '#D976FF', icon: LayoutIcon },
    { id: 'li-post', label: 'Write the LinkedIn teardown', reason: 'Your LinkedIn audience over-indexes on this pillar.', color: '#4DA3FF', icon: FileText },
    { id: 'newsletter', label: 'Expand into a newsletter issue', reason: 'Highest conversion to owned audience of any format.', color: '#34D399', icon: FileText },
  ]
  return pool.filter((p) => !existing.has(p.id)).slice(0, 3)
}

function LayoutIcon(props: { className?: string }) {
  return <Layers {...props} />
}

function intelligence(
  ds: ReturnType<typeof useDataset>,
  content: Content,
  stats: { words: number; minutes: number },
  perf?: Content['performance'],
): { lead: string; body: string }[] {
  const out: { lead: string; body: string }[] = []
  const peers = ds.content.filter((c) => c.topicId === content.topicId && c.performance && c.id !== content.id)
  const avgPeerViews = peers.length ? peers.reduce((s, c) => s + (c.performance?.views ?? 0), 0) / peers.length : 0

  if (perf && avgPeerViews) {
    const delta = ((perf.views - avgPeerViews) / avgPeerViews) * 100
    out.push({
      lead: `${delta >= 0 ? 'Outperforming' : 'Underperforming'} topic median by ${Math.abs(delta).toFixed(0)}%.`,
      body: `Peer average in “${ds.topics.find((t) => t.id === content.topicId)?.name}” is ${fmtNumber(Math.round(avgPeerViews))} views.`,
    })
  } else {
    out.push({
      lead: `${stats.minutes.toFixed(1)} minutes`,
      body: `at ${stats.words} words. Your best-performing long form sits between 16 and 24 minutes.`,
    })
  }

  const similar = ds.content.filter((c) => c.brief.hook && c.id !== content.id && c.tags.some((t) => content.tags.includes(t)))
  if (similar.length) {
    out.push({
      lead: `${similar.length} closely related piece${similar.length > 1 ? 's' : ''} in your catalogue.`,
      body: `“${similar[0].title}” shares this topic and format — consider linking it in the description for session time.`,
    })
  }

  const chain = content.derivativeIds.length
  out.push({
    lead: chain ? `${chain} derivative${chain > 1 ? 's' : ''} already linked.` : 'No derivatives yet.',
    body: chain
      ? 'Each one carries its own analytics and rolls back up to this piece.'
      : 'Repurposing typically adds 40–60% incremental reach at a fraction of the production cost.',
  })

  const daysToDeadline = relativeDays(content.deadline)
  if (daysToDeadline !== null && daysToDeadline <= 5 && !['published', 'archived'].includes(content.status)) {
    out.push({
      lead: daysToDeadline < 0 ? `${Math.abs(daysToDeadline)} days overdue.` : `${daysToDeadline} days to deadline.`,
      body: daysToDeadline < 0 ? 'This is now the critical path for everything downstream.' : 'Two post-production stages remain.',
    })
  }

  return out.slice(0, 4)
}

function DetailSkeleton() {
  return (
    <Page width="wide">
      <Skeleton className="h-3 w-20" />
      <div className="mt-3 flex gap-3.5">
        <Skeleton className="h-[62px] w-[104px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-[420px]" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <Skeleton className="mt-4 h-[68px] rounded-xl" />
      <div className="mt-4 grid gap-3.5 xl:grid-cols-[1fr_336px]">
        <Skeleton className="h-[520px] rounded-xl" />
        <div className="space-y-3.5">
          <Skeleton className="h-[240px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>
    </Page>
  )
}
