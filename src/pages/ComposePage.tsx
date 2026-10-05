import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Radio,
  RotateCcw,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { Page, PageHeader } from '@/components/ui/Page'
import { Panel, PanelHeader, Badge, EmptyState, SectionHeader, KeyValue } from '@/components/ui/Surface'
import { Button } from '@/components/ui/Button'
import { Segmented, Textarea } from '@/components/ui/Field'
import { Inset, StickyActions } from '@/components/ui/blocks'
import { ComposeForm, adaptFromSource, mediaLabel, type DraftValues } from '@/components/compose/ComposeForm'
import { PlatformRail, ConnectionSummary, PLATFORM_COLORS } from '@/components/compose/PlatformRail'
import { BrandMark } from '@/components/compose/BrandMark'
import { PREVIEWS } from '@/components/compose/previews'
import { useDataset } from '@/lib/hooks'
import { useApp } from '@/store/app'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/format'
import { LIVE_TOOLKIT_IDS, emptyValues, fieldsFor, toolkitDef } from '@/integrations/registry'
import { validateDraft } from '@/integrations/validate'
import type { PublishResult, ToolkitId } from '@/integrations/types'
import { useIntegrations } from '@/integrations/useIntegrations'

/* ============================================================================
   COMPOSE
   One source of truth for the message, three platform-native shapes for the
   delivery. The left column holds what stays the same across platforms; the
   middle column is the platform's own field schema; the right column is the
   platform's own rendering of what you typed, plus the pre-flight check that
   decides whether publishing will work.

   Publishing goes through the integration boundary, so the same screen drives
   the local transport today and Composio the moment a key is behind the proxy.
   ========================================================================== */

const MODELS: Record<ToolkitId, string[]> = {
  youtube: ['video', 'short'],
  instagram: ['reel', 'image', 'carousel', 'story'],
  linkedin: ['text', 'image', 'video', 'document'],
}

interface Source {
  hook: string
  body: string
  cta: string
  tags: string[]
}

const EMPTY_SOURCE: Source = { hook: '', body: '', cta: '', tags: [] }

export default function ComposePage() {
  const ds = useDataset()
  const integrations = useIntegrations()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pushToast = useApp((s) => s.pushToast)

  const contentId = params.get('content')
  const content = contentId ? ds.content.find((c) => c.id === contentId) : undefined

  const [selected, setSelected] = useState<ToolkitId>('youtube')
  const [enabled, setEnabled] = useState<Record<ToolkitId, boolean>>({ youtube: true, instagram: false, linkedin: false })
  const [mediaType, setMediaType] = useState<Record<ToolkitId, string>>({
    youtube: 'video',
    instagram: 'reel',
    linkedin: 'text',
  })
  const [values, setValues] = useState<Record<ToolkitId, DraftValues>>(() => ({
    youtube: emptyValues('youtube'),
    instagram: emptyValues('instagram'),
    linkedin: emptyValues('linkedin'),
  }))
  const [source, setSource] = useState<Source>(EMPTY_SOURCE)
  const [scheduledFor, setScheduledFor] = useState('')
  const [result, setResult] = useState<PublishResult | null>(null)

  /* Pre-fill from a content object: the brief is the message, the title is the
     hook, the keywords are the tags. Nothing is invented for the creator. */
  useEffect(() => {
    if (!content) return
    setSource({
      hook: content.brief.hook || content.title,
      body: content.brief.coreMessage || content.brief.objective,
      cta: content.brief.cta,
      tags: content.brief.keywords.length ? content.brief.keywords : content.tags,
    })
    setEnabled({
      youtube: content.platforms.includes('youtube'),
      instagram: content.platforms.includes('instagram'),
      linkedin: content.platforms.includes('linkedin'),
    })
    const first = LIVE_TOOLKIT_IDS.find((t) => content.platforms.includes(t))
    if (first) setSelected(first)
    setValues({
      youtube: { ...emptyValues('youtube'), title: content.title.slice(0, 100), tags: content.brief.keywords.slice(0, 15) },
      instagram: { ...emptyValues('instagram') },
      linkedin: { ...emptyValues('linkedin') },
    })
  }, [content])

  const problems = useMemo(
    () =>
      Object.fromEntries(
        LIVE_TOOLKIT_IDS.map((t) => [t, validateDraft(t, values[t], mediaType[t])]),
      ) as Record<ToolkitId, ReturnType<typeof validateDraft>>,
    [values, mediaType],
  )

  const problemCount = useMemo(
    () =>
      Object.fromEntries(LIVE_TOOLKIT_IDS.map((t) => [t, problems[t].filter((p) => p.severity === 'error').length])) as Record<
        ToolkitId,
        number
      >,
    [problems],
  )

  const targets = LIVE_TOOLKIT_IDS.filter((t) => enabled[t] && integrations.accountFor(t)?.status === 'active' && problemCount[t] === 0)
  const blockedCount = LIVE_TOOLKIT_IDS.filter((t) => enabled[t]).length - targets.length
  const publishing = Boolean(integrations.busy.publish)

  const applySource = (t: ToolkitId) => {
    setValues((v) => ({ ...v, [t]: adaptFromSource(t, mediaType[t], source, v[t]) }))
    pushToast({ kind: 'info', title: `${toolkitDef(t).toolkitSlug} draft adapted`, body: 'Shared copy reshaped for the platform. Review before publishing.' })
  }

  const applyAll = () => {
    setValues((v) => ({
      youtube: adaptFromSource('youtube', mediaType.youtube, source, v.youtube),
      instagram: adaptFromSource('instagram', mediaType.instagram, source, v.instagram),
      linkedin: adaptFromSource('linkedin', mediaType.linkedin, source, v.linkedin),
    }))
    pushToast({ kind: 'info', title: 'Drafts adapted for all platforms' })
  }

  const handlePublish = async () => {
    const scheduled = scheduledFor ? new Date(scheduledFor).toISOString() : undefined
    const res = await integrations.publish({
      contentId: content?.id,
      targets: targets.map((t) => ({ toolkit: t, connectedAccountId: integrations.accountFor(t)?.id })),
      values,
      mediaType,
      scheduledFor: scheduled,
    })
    setResult(res)
    if (!res) return

    const ok = res.attempts.filter((a) => a.status === 'succeeded')
    const failed = res.attempts.filter((a) => a.status === 'failed')
    if (ok.length) {
      pushToast({
        kind: 'success',
        title: scheduled ? `Scheduled ${ok.length} post${ok.length === 1 ? '' : 's'}` : `Published ${ok.length} post${ok.length === 1 ? '' : 's'}`,
        body: ok.map((a) => toolkitDef(a.toolkit).toolkitSlug).join(', '),
        action: ok[0].url ? { label: 'View', run: () => window.open(ok[0].url, '_blank', 'noopener,noreferrer') } : undefined,
      })
    }
    if (failed.length) {
      pushToast({ kind: 'error', title: `${failed.length} platform${failed.length === 1 ? '' : 's'} failed`, body: failed[0].error?.hint ?? failed[0].error?.message })
    }
  }

  const reset = () => {
    setValues({ youtube: emptyValues('youtube'), instagram: emptyValues('instagram'), linkedin: emptyValues('linkedin') })
    setSource(EMPTY_SOURCE)
    setResult(null)
    setScheduledFor('')
  }

  const def = toolkitDef(selected)
  const Preview = PREVIEWS[selected]
  const account = integrations.accountFor(selected)
  const selectedProblems = problems[selected]

  return (
    <Page width="wide">
      <PageHeader
        eyebrow={content ? `Content ${content.code}` : 'Ad-hoc publish'}
        title={content ? `Compose · ${content.title}` : 'Compose'}
        description={
          content
            ? `Publishing ${content.code} to ${LIVE_TOOLKIT_IDS.filter((t) => enabled[t]).length || 'no'} platform${LIVE_TOOLKIT_IDS.filter((t) => enabled[t]).length === 1 ? '' : 's'}. ${content.platforms.length} listed in the production plan.`
            : 'Write once, adapt per platform, publish through Composio. Fields, limits and previews come from each platform’s own schema.'
        }
        actions={
          <>
            {content && (
              <Button size="sm" variant="outline" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate(`/content/${content.id}`)}>
                Open content
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>
              Clear
            </Button>
          </>
        }
        meta={<ConnectionSummary integrations={integrations} />}
      />

      {integrations.transport === 'composio' && integrations.proxyReady === false && (
        <Panel className="border-amber/25 bg-amber/[0.04]">
          <div className="flex items-start gap-2.5 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-ink-hi">Composio transport selected but not configured</p>
              <p className="mt-1 max-w-[90ch] text-[11.5px] leading-relaxed text-ink-low">
                The proxy at <span className="mono text-ink-mid">/api/composio</span> has no API key. Set{' '}
                <span className="mono text-ink-mid">COMPOSIO_API_KEY</span> in the environment running the dev server and restart it. The key is a project
                key, so it is injected server-side and never reaches the browser. Publishing will fail until then — switch to the local transport in
                Settings to keep working.
              </p>
            </div>
            <Button size="xs" variant="outline" onClick={() => integrations.setTransport('local')}>
              Use local transport
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        {/* ---------------------------------------------------- source rail */}
        <aside className="space-y-3">
          <Panel>
            <PanelHeader dense title="Platforms" subtitle={targets.length ? `${targets.length} ready` : 'none ready'} />
            <div className="p-2.5">
              <PlatformRail
                integrations={integrations}
                selected={selected}
                onSelect={setSelected}
                enabled={enabled}
                onToggle={(t, on) => setEnabled((e) => ({ ...e, [t]: on }))}
                problemCount={problemCount}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense title="Shared source" subtitle="The message, once" />
            <div className="space-y-3 p-3">
              <SourceField label="Hook" value={source.hook} onChange={(hook) => setSource((s) => ({ ...s, hook }))} rows={2} hint="The first line everywhere." />
              <SourceField label="Body" value={source.body} onChange={(body) => setSource((s) => ({ ...s, body }))} rows={5} hint="The substance." />
              <SourceField label="Call to action" value={source.cta} onChange={(cta) => setSource((s) => ({ ...s, cta }))} rows={2} hint="One ask." />
              <div>
                <p className="cell-label mb-1.5">Tags</p>
                <p className="mono truncate text-[10.5px] text-ink-faint">{source.tags.length ? source.tags.join(' ') : 'None yet'}</p>
              </div>
              <Button size="sm" variant="accent-soft" icon={<Wand2 className="h-3.5 w-3.5" />} block onClick={applyAll} disabled={!source.hook && !source.body}>
                Adapt for all platforms
              </Button>
            </div>
          </Panel>

          {content && (
            <Panel>
              <PanelHeader dense title="From content" />
              <div className="p-3">
                <dl className="grid grid-cols-1 gap-y-3">
                  <KeyValue label="Type" value={ds.contentTypes.find((t) => t.id === content.typeId)?.name ?? '—'} />
                  <KeyValue label="Topic" value={ds.topics.find((t) => t.id === content.topicId)?.name ?? '—'} />
                  <KeyValue label="Target date" value={content.publishDate ? fmtDate(content.publishDate, 'long') : 'Unscheduled'} mono />
                </dl>
              </div>
            </Panel>
          )}
        </aside>

        {/* ------------------------------------------------------ composer */}
        <section className="min-w-0 space-y-3">
          <Panel glow={2}>
            <PanelHeader
              icon={<span style={{ color: PLATFORM_COLORS[selected] }}>{iconFor(selected)}</span>}
              title={`${def.toolkitSlug} ${def.publishNoun}`}
              subtitle={
                account?.status === 'active'
                  ? `Publishing as ${account.handle ?? account.accountName}`
                  : 'Connect this platform to publish'
              }
              actions={
                <>
                  <Button size="xs" variant="ghost" icon={<Copy className="h-3 w-3" />} onClick={() => applySource(selected)}>
                    Adapt from source
                  </Button>
                  {account?.status === 'active' ? (
                    <Badge tone="success" size="xs" dot="#34D399">
                      Live
                    </Badge>
                  ) : (
                    <Button size="xs" variant="accent-soft" onClick={() => integrations.connect(selected)} disabled={Boolean(integrations.busy[`connect:${selected}`])}>
                      {integrations.busy[`connect:${selected}`] ? 'Linking…' : 'Connect'}
                    </Button>
                  )}
                </>
              }
            />

            <div className="border-b border-line-1 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="cell-label">Format</span>
                <div className="flex flex-wrap gap-1.5">
                  {MODELS[selected].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMediaType((v) => ({ ...v, [selected]: m }))}
                      className={cn(
                        'rounded-md border px-2 py-1 text-[11px] transition-colors duration-150',
                        mediaType[selected] === m
                          ? 'border-accent/40 bg-accent/12 text-accent-ink'
                          : 'border-line-2 bg-surface-1 text-ink-mid hover:border-line-3 hover:bg-white/[0.04]',
                      )}
                    >
                      {mediaLabel(selected, m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4">
              {account?.status === 'active' ? (
                <ComposeForm
                  toolkit={selected}
                  mediaType={mediaType[selected]}
                  values={values[selected]}
                  onChange={(next) => setValues((v) => ({ ...v, [selected]: next }))}
                  problems={selectedProblems}
                />
              ) : (
                <EmptyState
                  icon={iconFor(selected)}
                  title={`${def.toolkitSlug} is not connected`}
                  body={`Connect your ${def.toolkitSlug} account to compose and publish ${def.publishNoun}s. Composio handles the OAuth flow and holds the token — Creator OS never sees your password.`}
                  actions={
                    <Button size="sm" variant="primary" onClick={() => integrations.connect(selected)} loading={Boolean(integrations.busy[`connect:${selected}`])}>
                      Connect {def.toolkitSlug}
                    </Button>
                  }
                />
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense title="Delivery" subtitle={def.capabilities.scheduleNote} icon={<CalendarClock />} />
            <div className="flex flex-wrap items-center gap-3 p-3.5">
              <Segmented
                size="sm"
                value={scheduledFor ? 'schedule' : 'now'}
                onChange={(v) => setScheduledFor(v === 'now' ? '' : defaultSchedule())}
                options={[
                  { id: 'now', label: 'Publish now' },
                  { id: 'schedule', label: 'Schedule' },
                ]}
              />
              {scheduledFor && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="mono rounded-md border border-line-2 bg-surface-1 px-2 py-1.5 text-[12px] text-ink-hi outline-none focus:border-accent/45"
                />
              )}
              {!def.capabilities.supportsScheduling && scheduledFor && (
                <span className="flex items-center gap-1.5 text-[10.5px] text-amber">
                  <AlertTriangle className="h-3 w-3" /> No first-party scheduling scope — this will publish immediately.
                </span>
              )}
            </div>
          </Panel>
        </section>

        {/* ------------------------------------------- preview + preflight */}
        <aside className="space-y-3">
          <Panel>
            <PanelHeader dense title="Preview" />
            <div className="p-3.5">
              <Preview values={values[selected]} mediaType={mediaType[selected]} creator={ds.creator} account={account} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              dense
              icon={<Radio />}
              title="Pre-flight"
              subtitle={targets.length ? `${targets.length} will publish${blockedCount ? `, ${blockedCount} blocked` : ''}` : 'Nothing ready'}
            />
            <div className="space-y-2 p-3">
              <Preflight
                values={values}
                mediaType={mediaType}
                problems={problems}
                enabled={enabled}
                integrations={integrations}
                onSelect={setSelected}
                result={result}
              />

              <StickyActions className="-mx-3.5 px-3.5">
                <Button
                  variant="primary"
                  size="md"
                  icon={publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  onClick={handlePublish}
                  disabled={!targets.length || publishing}
                  block
                >
                  {publishing
                    ? 'Publishing…'
                    : scheduledFor
                      ? `Schedule ${targets.length || ''}`
                      : `Publish ${targets.length ? `to ${targets.length}` : ''}`}
                </Button>
              </StickyActions>
            </div>
          </Panel>

          {result && <PublishReceipt result={result} onDismiss={() => setResult(null)} />}

          <Panel>
            <PanelHeader dense title="Field reference" subtitle={`${fieldsFor(selected, mediaType[selected]).length} fields in the ${def.toolkitSlug} schema`} />
            <div className="p-3">
              <ul className="space-y-1.5">
                {fieldsFor(selected, mediaType[selected]).map((f) => (
                  <li key={f.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[11px] text-ink-mid">{f.label}</span>
                    <span className="mono shrink-0 text-[9.5px] text-ink-faint">
                      {f.limit ? `${f.limit}` : f.maxItems ? `${f.maxItems} max` : f.kind}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </aside>
      </div>
    </Page>
  )
}

/* -------------------------------------------------------------------------- */

function iconFor(t: ToolkitId) {
  return <BrandMark platform={t} className="h-3.5 w-3.5" />
}

function defaultSchedule() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SourceField({
  label,
  value,
  onChange,
  rows,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows: number
  hint?: string
}) {
  return (
    <div>
      <p className="cell-label mb-1.5">{label}</p>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="text-[12px]" />
      {hint && <p className="mt-1 text-[10px] text-ink-faint">{hint}</p>}
    </div>
  )
}

function Preflight({
  values,
  mediaType,
  problems,
  enabled,
  integrations,
  onSelect,
  result,
}: {
  values: Record<ToolkitId, DraftValues>
  mediaType: Record<ToolkitId, string>
  problems: Record<ToolkitId, ReturnType<typeof validateDraft>>
  enabled: Record<ToolkitId, boolean>
  integrations: ReturnType<typeof useIntegrations>
  onSelect: (t: ToolkitId) => void
  result: PublishResult | null
}) {
  const rows = LIVE_TOOLKIT_IDS.filter((t) => enabled[t])

  if (!rows.length) {
    return <EmptyState icon={<Sparkles />} title="No platforms selected" body="Tick a platform in the rail to compose for it." />
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((t) => {
        const def = toolkitDef(t)
        const account = integrations.accountFor(t)
        const connected = account?.status === 'active'
        const errors = problems[t].filter((p) => p.severity === 'error')
        const warnings = problems[t].filter((p) => p.severity === 'warn')
        const attempt = result?.attempts.find((a) => a.toolkit === t)
        const ok = connected && errors.length === 0

        return (
          <li key={t}>
            <Inset className={cn('cursor-pointer', !ok && 'border-amber/20')} >
              <button type="button" onClick={() => onSelect(t)} className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: connected ? (errors.length ? '#FBBF24' : '#34D399') : '#3A4048' }} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-ink-hi">{def.toolkitSlug}</span>
                  {attempt?.status === 'succeeded' && (
                    <a
                      href={attempt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-ink-faint transition-colors hover:text-accent"
                      aria-label={`Open ${def.toolkitSlug} post`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink-low">
                  {!connected
                    ? account?.status === 'expired'
                      ? 'Connection expired — reconnect to publish.'
                      : 'Not connected — will be skipped.'
                    : errors.length
                      ? `${errors[0].label} ${errors[0].message}.`
                      : mediaLabel(t, mediaType[t]) + ' · ready'}
                </p>
                {connected && !errors.length && warnings.length > 0 && (
                  <p className="mt-1 text-[10.5px] leading-relaxed text-amber/85">{warnings[0].label} {warnings[0].message}.</p>
                )}
                {connected && !errors.length && warnings.length === 0 && (
                  <p className="mt-1 mono text-[9.5px] text-ink-faint">
                    {Object.values(values[t]).filter((v) => String(v).length).length} fields set
                  </p>
                )}
              </button>
            </Inset>
          </li>
        )
      })}
    </ul>
  )
}

function PublishReceipt({ result, onDismiss }: { result: PublishResult; onDismiss: () => void }) {
  const ok = result.attempts.filter((a) => a.status === 'succeeded')
  return (
    <Panel className={ok.length ? 'border-emerald/25' : 'border-rose/25'}>
      <PanelHeader
        dense
        icon={ok.length ? <CheckCircle2 className="text-emerald" /> : <AlertTriangle className="text-rose" />}
        title={ok.length ? `Published to ${ok.length}` : 'Publish failed'}
        subtitle={`${result.transport === 'composio' ? 'Composio' : 'Local transport'} · ${new Date(result.at).toLocaleTimeString()}`}
        actions={
          <Button size="xs" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        }
      />
      <ul className="space-y-1.5 p-3">
        {result.attempts.map((a) => (
          <li key={a.toolkit} className="flex items-center gap-2">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', a.status === 'succeeded' ? 'bg-emerald' : 'bg-rose')} />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{toolkitDef(a.toolkit).toolkitSlug}</span>
            {a.toolSlug && <span className="mono shrink-0 text-[9px] text-ink-faint">{a.toolSlug}</span>}
            <span className="mono shrink-0 text-[9.5px] text-ink-faint">{a.durationMs}ms</span>
          </li>
        ))}
      </ul>
      {result.attempts.some((a) => a.error) && (
        <div className="border-t border-line-1 p-3">
          <SectionHeader label="Why" />
          {result.attempts
            .filter((a) => a.error)
            .map((a) => (
              <p key={a.toolkit} className="mt-1.5 text-[10.5px] leading-relaxed text-ink-low">
                <span className="text-ink-mid">{toolkitDef(a.toolkit).toolkitSlug}:</span> {a.error!.hint}
              </p>
            ))}
        </div>
      )}
    </Panel>
  )
}
