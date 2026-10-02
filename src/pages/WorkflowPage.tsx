import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Blocks,
  Check,
  CircleDashed,
  Copy,
  GitBranch,
  Layers,
  Plus,
  Settings2,
  Sparkles,
  Timer,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { CONTENT_TYPES, PIPELINE_STAGES, STATUSES, contentTypeById, statusById } from '@/data/registry'
import { fmtNumber } from '@/lib/format'
import { pipelineStats } from '@/analytics/queries'
import type { ContentTypeDef } from '@/data/types'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Input, Segmented, Switch, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { Tooltip } from '@/components/ui/Tooltip'
import { RankedBars } from '@/components/charts/Bars'

/* ============================================================================
   WORKFLOW
   The operating manual made editable: pipeline stages, content types (including
   a working type builder), templates and automation rules.
   ========================================================================== */

export function WorkflowPage() {
  const ds = useDataset()
  const settled = useSettled(180)
  const customTypes = useApp((s) => s.customTypes)
  const addCustomType = useApp((s) => s.addCustomType)
  const pushToast = useApp((s) => s.pushToast)
  const [tab, setTab] = useState<'pipeline' | 'types' | 'templates' | 'automation'>('pipeline')
  const [builderOpen, setBuilderOpen] = useState(false)

  const allTypes = useMemo(() => [...CONTENT_TYPES, ...customTypes], [customTypes])
  const stages = useMemo(() => pipelineStats(ds, PIPELINE_STAGES), [ds])

  if (!settled) {
    return (
      <Page width="wide">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-5 h-[460px] rounded-xl" />
      </Page>
    )
  }

  const typeUsage = allTypes
    .map((t) => ({
      id: t.id,
      label: t.name,
      value: ds.content.filter((c) => c.typeId === t.id).length,
      color: t.color,
      sub: `${ds.content.filter((c) => c.typeId === t.id && c.performance).length} published`,
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Workspace"
        title="Workflow"
        description="How work moves here: the pipeline, the content types, the templates that pre-shape a piece, and the rules that remove manual steps."
        actions={
          <>
            <Button variant="secondary" size="md" icon={<Settings2 />} onClick={() => pushToast({ kind: 'info', title: 'Stage rules', body: 'Transition rules are enforced on drag and drop.' })}>
              Stage rules
            </Button>
            <Button variant="primary" size="md" icon={<Plus />} onClick={() => setBuilderOpen(true)}>
              New content type
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-3.5"
        items={[
          { label: 'Pipeline stages', value: String(PIPELINE_STAGES.length), hint: `${ds.content.length} pieces in flight` },
          { label: 'Content types', value: String(allTypes.length), hint: `${customTypes.length} custom built here`, accent: '#A78BFA' },
          { label: 'Templates', value: String(ds.templates.length), hint: `${ds.templates.reduce((s, t) => s + t.usage, 0)} uses` },
          { label: 'Automations', value: '6', hint: '4 active · 2 suggestions', accent: '#34D399' },
        ]}
      />

      <Segmented
        className="mb-3.5"
        ariaLabel="Workflow section"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'pipeline', label: <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Pipeline</span> },
          { id: 'types', label: <span className="inline-flex items-center gap-1.5"><Blocks className="h-3.5 w-3.5" /> Content types</span> },
          { id: 'templates', label: <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Templates</span> },
          { id: 'automation', label: <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Automation</span> },
        ]}
      />

      {tab === 'pipeline' && (
        <SplitGrid ratio="wide">
          <Panel>
            <PanelHeader icon={<GitBranch />} title="Pipeline" subtitle="Each stage carries a definition of done — that is what keeps the board honest" />
            <ol className="relative divide-y divide-[var(--color-line-1)]">
              {stages.map((stage, i) => {
                const def = statusById(stage.id)
                return (
                  <li key={stage.id} className="relative flex items-start gap-3.5 px-4 py-3.5">
                    <span className="relative grid h-7 w-7 shrink-0 place-items-center">
                      <span className="absolute inset-0 rounded-lg border" style={{ borderColor: `${def.accent}44`, background: `${def.accent}14` }} />
                      <span className="mono relative text-[10.5px]" style={{ color: def.accent }}>
                        {i + 1}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-medium text-ink-hi">{def.name}</p>
                        <Badge tone="outline" size="xs" mono>
                          {stage.count} pieces
                        </Badge>
                        {stage.overdue > 0 && (
                          <Badge tone="danger" size="xs">
                            {stage.overdue} overdue
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-low">{STAGE_DEFS[def.id] ?? 'Work in progress in this stage.'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="mono text-[9.5px] text-ink-faint">avg age {stage.avgAgeDays}d</span>
                        <span className="mono text-[9.5px] text-ink-faint">capacity {stage.count}/8</span>
                      </div>
                    </div>
                    <div className="hidden w-24 shrink-0 sm:block">
                      <Progress value={Math.min(1, stage.count / 8)} max={1} color={def.accent} size="xs" />
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Timer />} title="Cycle time" subtitle="Days from idea to publish, last 12 pieces" />
              <div className="p-3.5">
                <RankedBars
                  height={200}
                  metricId="views"
                  showValue={false}
                  rows={ds.content
                    .filter((c) => c.publishDate)
                    .slice(-12)
                    .map((c) => ({
                      id: c.id,
                      label: c.title.slice(0, 34),
                      value: Math.max(1, Math.round((+new Date(c.publishDate!) - +new Date(c.createdAt)) / 86_400_000)),
                      color: '#5B9DFF',
                    }))}
                />
                <p className="mt-2 text-[10.5px] text-ink-faint">Bar length is days from creation to publish. Long bars cluster around research-heavy pieces.</p>
              </div>
            </Panel>

            <Panel>
              <PanelHeader dense icon={<CircleDashed />} title="Stage definitions" subtitle="What &quot;done&quot; means in each column" />
              <div className="space-y-2 p-3.5">
                {STATUSES.filter((s) => s.id !== 'archived').map((s) => (
                  <div key={s.id} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.accent }} />
                    <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-ink-low">
                      <span className="text-ink">{s.name}</span> — {STAGE_DEFS[s.id] ?? 'Work in progress in this stage.'}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </SplitGrid>
      )}

      {tab === 'types' && (
        <SplitGrid ratio="wide">
          <div className="grid gap-3 sm:grid-cols-2">
            {allTypes.map((type) => {
              const count = ds.content.filter((c) => c.typeId === type.id).length
              const Icon = type.id.startsWith('yt') ? Layers : type.id.startsWith('ig') ? Blocks : type.id.startsWith('li') ? Settings2 : Wand2
              return (
                <Panel key={type.id} interactive className="p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${type.color}44`, background: `${type.color}14` }}>
                      <Icon className="h-4 w-4" style={{ color: type.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-medium text-ink-hi">{type.name}</p>
                        {type.custom && <Badge tone="violet" size="xs">custom</Badge>}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-low">{type.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="mono text-[9.5px] text-ink-faint">{count} pieces</span>
                        <span className="mono text-[9.5px] text-ink-faint">{type.fields.length} custom fields</span>
                        <span className="mono text-[9.5px] text-ink-faint">default {type.format}</span>
                      </div>
                    </div>
                    <IconButton label="Duplicate type" icon={<Copy />} size="xs" onClick={() => {
                      addCustomType({ ...type, id: `${type.id}-copy-${Date.now()}`, name: `${type.name} (copy)`, custom: true })
                      pushToast({ kind: 'success', title: 'Type duplicated', body: 'Edit the copy to change its fields.' })
                    }} />
                  </div>
                  {type.fields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line-1 pt-2.5">
                      {type.fields.map((f) => (
                        <Badge key={f.id} tone="outline" size="xs">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Panel>
              )
            })}
          </div>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Blocks />} title="Type usage" subtitle="Where your catalogue actually sits" />
              <div className="p-3.5">
                <RankedBars height={240} metricId="views" rows={typeUsage.slice(0, 9)} />
              </div>
            </Panel>
            <Panel glow={1}>
              <div className="grid-etch p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-accent-ink">
                  <Sparkles className="h-3.5 w-3.5" /> Type builder
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mid">
                  A custom type is a first-class citizen: it gets its own fields, its own default format and its own template — no code, no separate table.
                </p>
                <Button size="sm" variant="accent-soft" className="mt-3" icon={<Plus />} onClick={() => setBuilderOpen(true)}>
                  Build a type
                </Button>
              </div>
            </Panel>
          </div>
        </SplitGrid>
      )}

      {tab === 'templates' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {ds.templates.map((t) => {
            const type = contentTypeById(t.typeId)
            return (
              <Panel key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink-hi">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: type.color }} />
                      {t.name}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-low">{t.description}</p>
                  </div>
                  <Badge tone="outline" size="xs" mono>
                    {t.usage} uses
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {t.stages.map((s, i) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <Badge tone="neutral" size="xs">
                        {s}
                      </Badge>
                      {i < t.stages.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-ink-ghost" />}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-line-1 pt-2.5">
                  <span className="mono text-[9.5px] text-ink-faint">{type.name}</span>
                  <span className="text-ink-ghost">·</span>
                  <span className="mono text-[9.5px] text-ink-faint">checklist and brief prefilled</span>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      {tab === 'automation' && (
        <SplitGrid ratio="wide">
          <Panel className="overflow-hidden">
            <PanelHeader icon={<Zap />} title="Automation rules" subtitle="Small rules that remove recurring manual work" />
            <ul className="divide-y divide-[var(--color-line-1)]">
              {[
                { id: 'a1', name: 'Move to Editing when script is complete', detail: 'Triggers when every script block has a body and the checklist group "pre" is done.', on: true, runs: 41 },
                { id: 'a2', name: 'Create derivative drafts on publish', detail: 'Creates a Short and a LinkedIn post stub linked to the parent piece.', on: true, runs: 18 },
                { id: 'a3', name: 'Deadline warning at 72 hours', detail: 'Pushes a warning notification and marks the item on the dashboard rail.', on: true, runs: 96 },
                { id: 'a4', name: 'Invoice reminder after 14 days', detail: 'Drafts a polite chase email when an invoice passes its due date.', on: true, runs: 5 },
                { id: 'a5', name: 'Archive pieces below 15% of median views', detail: 'Suggests archiving after 90 days with no engagement.', on: false, runs: 0 },
                { id: 'a6', name: 'Auto-generate chapter markers', detail: 'Uses the script section headings to build YouTube chapters.', on: false, runs: 0 },
              ].map((rule) => (
                <li key={rule.id} className="flex items-start gap-3.5 px-4 py-3.5">
                  <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border', rule.on ? 'border-emerald/30 bg-emerald/[0.08]' : 'border-line-2 bg-white/[0.02]')}>
                    {rule.on ? <Check className="h-3.5 w-3.5 text-emerald" /> : <CircleDashed className="h-3.5 w-3.5 text-ink-ghost" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[12.5px]', rule.on ? 'text-ink-hi' : 'text-ink-low')}>{rule.name}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-low">{rule.detail}</p>
                    <p className="mono mt-1.5 text-[9.5px] text-ink-faint">{rule.runs} runs this quarter</p>
                  </div>
                  <Switch checked={rule.on} onChange={() => pushToast({ kind: 'success', title: rule.on ? 'Automation paused' : 'Automation enabled', body: rule.name })} label={`Toggle ${rule.name}`} />
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Timer />} title="Time reclaimed" subtitle="Estimated manual steps removed this quarter" />
              <div className="grid grid-cols-2 gap-3.5 p-3.5">
                <KeyValue label="Rules running" value="4" hint="of 6 configured" />
                <KeyValue label="Triggered runs" value="160" hint="this quarter" mono />
                <KeyValue label="Est. hours saved" value="23.5h" hint="at 9 minutes per run" mono />
                <KeyValue label="Value at rate" value="$2,350" hint="at $100/hour" mono />
              </div>
            </Panel>
            <Panel>
              <PanelHeader dense icon={<Wand2 />} title="Suggested next" subtitle="Patterns the system noticed in your workflow" />
              <ul className="divide-y divide-[var(--color-line-1)]">
                {[
                  { label: 'Pre-fill the brief from the linked idea', detail: 'You copy the hook and audience manually 14 times this quarter.' },
                  { label: 'Attach research automatically by topic', detail: 'Pieces in RAG and Agents cite the same three sources each time.' },
                ].map((s) => (
                  <li key={s.label} className="flex items-start gap-3 px-3.5 py-3">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] text-ink-hi">{s.label}</p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-ink-low">{s.detail}</p>
                    </div>
                    <Tooltip content="Enable this rule" side="left">
                      <Button size="xs" variant="ghost" onClick={() => pushToast({ kind: 'success', title: 'Rule created', body: s.label })}>
                        Enable
                      </Button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </SplitGrid>
      )}

      <TypeBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} onCreate={(type) => {
        addCustomType(type)
        pushToast({ kind: 'success', title: 'Content type created', body: `“${type.name}” is available in quick-create and the content database.` })
        setBuilderOpen(false)
      }} />
    </Page>
  )
}

/** Definition of done per stage — the contract each column enforces. */
const STAGE_DEFS: Record<string, string> = {
  idea: 'A captured thought with a hook. No research required yet.',
  research: 'Sources gathered or a benchmark run. Claims are defensible.',
  brief: 'Objective, audience, message and CTA written. Ready to script.',
  scripting: 'A full script with a hook, sections and a close.',
  production: 'Footage or assets captured to the shot list.',
  editing: 'Rough cut complete, b-roll and graphics placed.',
  review: 'Watched end to end with corrections logged.',
  ready: 'Export, thumbnail, title, description and chapters complete.',
  scheduled: 'Queued with a publish time and derivative drafts created.',
  published: 'Live, with performance tracking and attribution running.',
  archived: 'Retired from the active catalogue but kept for reference.',
}

/* ============================================================================
   TYPE BUILDER
   ========================================================================== */
function TypeBuilder({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (type: ContentTypeDef) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#5B9DFF')
  const [fields, setFields] = useState<{ id: string; label: string; type: ContentTypeDef['fields'][number]['type'] }[]>([
    { id: 'f-1', label: 'Sponsor', type: 'text' },
  ])
  const [fieldLabel, setFieldLabel] = useState('')

  const palette = ['#5B9DFF', '#38D6F5', '#A78BFA', '#34D399', '#FBBF24', '#FB7185']

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Build a content type"
      description="Custom types are stored alongside the built-ins and behave identically everywhere — pipeline, board, calendar and analytics."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus />}
            disabled={!name.trim()}
            onClick={() =>
              onCreate({
                id: `ct-custom-${Date.now()}`,
                name: name.trim(),
                description: description.trim() || 'Custom content type.',
                color,
                icon: 'blocks',
                format: 'long-form',
                platforms: ['youtube'],
                workflow: ['idea', 'brief', 'scripting', 'production', 'editing', 'review', 'ready', 'published'],
                fields: fields.map((f) => ({ id: f.id, label: f.label, type: f.type })),
                custom: true,
              })
            }
          >
            Create type
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="cell-label mb-1.5 block">Type name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Live workshop" />
          </label>
          <div>
            <span className="cell-label mb-1.5 block">Accent</span>
            <div className="flex items-center gap-2 pt-1.5">
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Use ${c}`}
                  className={cn('h-6 w-6 rounded-md border transition-transform', color === c ? 'scale-110 border-white/40' : 'border-transparent hover:scale-105')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="cell-label mb-1.5 block">Description</span>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this format for, and how is it different?" />
        </label>

        <div>
          <span className="cell-label mb-2 block">Custom fields</span>
          <ul className="space-y-1.5">
            {fields.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg border border-line-2 px-2.5 py-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="flex-1 text-[11.5px] text-ink">{f.label}</span>
                <Badge tone="outline" size="xs">
                  {f.type}
                </Badge>
                <IconButton label="Remove field" icon={<CircleDashed />} size="xs" onClick={() => setFields(fields.filter((x) => x.id !== f.id))} />
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Add a field, e.g. Guest"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fieldLabel.trim()) {
                  setFields([...fields, { id: `f-${Date.now()}`, label: fieldLabel.trim(), type: 'text' }])
                  setFieldLabel('')
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!fieldLabel.trim()) return
                setFields([...fields, { id: `f-${Date.now()}`, label: fieldLabel.trim(), type: 'text' }])
                setFieldLabel('')
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-line-2 bg-white/[0.016] p-3">
          <p className="cell-label mb-2">Preview</p>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: `${color}44`, background: `${color}14` }}>
              <Blocks className="h-4 w-4" style={{ color }} />
            </span>
            <span>
              <span className="block text-[12px] text-ink-hi">{name || 'Untitled type'}</span>
              <span className="block text-[10.5px] text-ink-low">{fields.length} fields · {fmtNumber(0)} pieces</span>
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
