import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, FileText, FlaskConical, Layers, Lightbulb, Plus, Sparkles, Upload, Wand2 } from 'lucide-react'
import { useApp } from '@/store/app'
import { useDataset } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Combobox, Input, Select, Textarea } from '@/components/ui/Field'
import { Badge, Panel } from '@/components/ui/Surface'
import { Modal } from '@/components/ui/Overlay'
import type { ContentFormatId, PlatformId } from '@/data/types'

/* ============================================================================
   CREATE FLOW
   One modal, six intents. Creating is the highest-frequency action in a creator
   workspace, so it stays shallow: pick intent → fill three fields → go.
   Custom content types are created here too, not buried in settings.
   ========================================================================== */

type Intent = 'content' | 'idea' | 'script' | 'research' | 'campaign' | 'asset' | 'type' | 'root'

const INTENTS: { id: Exclude<Intent, 'root'>; label: string; body: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'content', label: 'Content', body: 'A new piece with brief, script and checklist.', icon: <FileText />, accent: '#5B9DFF' },
  { id: 'idea', label: 'Idea', body: 'Capture a raw concept before you lose it.', icon: <Lightbulb />, accent: '#A78BFA' },
  { id: 'script', label: 'Script', body: 'Jump straight into the long-form editor.', icon: <Wand2 />, accent: '#38D6F5' },
  { id: 'research', label: 'Research', body: 'A source, stat, quote or competitor note.', icon: <FlaskConical />, accent: '#2DD4BF' },
  { id: 'campaign', label: 'Campaign', body: 'A multi-piece push with a shared objective.', icon: <Sparkles />, accent: '#FBBF24' },
  { id: 'asset', label: 'Asset', body: 'Upload footage, audio or documents.', icon: <Upload />, accent: '#34D399' },
]

export function CreateFlow() {
  const open = useApp((s) => s.createOpen)
  const context = useApp((s) => s.createContext)
  const setOpen = useApp((s) => s.setCreateOpen)
  const pushToast = useApp((s) => s.pushToast)
  const navigate = useNavigate()
  const ds = useDataset()

  const [intent, setIntent] = useState<Exclude<Intent, 'root'>>('content')
  const [title, setTitle] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['youtube'])
  const [typeId, setTypeId] = useState('yt-long')
  const [topicId, setTopicId] = useState('t-agents')
  const [hook, setHook] = useState('')
  const [body, setBody] = useState('')
  const [customName, setCustomName] = useState('')
  const [customFormat, setCustomFormat] = useState<ContentFormatId>('long-form')
  const [customFields, setCustomFields] = useState<{ id: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'checkbox' }[]>([])
  const [step, setStep] = useState<'pick' | 'form'>('pick')

  useEffect(() => {
    if (!open) return
    const valid = ['content', 'idea', 'script', 'research', 'campaign', 'asset']
    setIntent(valid.includes(context ?? '') ? ((context as Exclude<Intent, 'root'>) ?? 'content') : 'content')
    setStep(context && valid.includes(context) ? 'form' : 'pick')
    setTitle('')
    setHook('')
    setBody('')
    setCustomName('')
    setCustomFields([])
  }, [open, context])

  const addCustomType = useApp((s) => s.addCustomType)

  const contentForPlatform = useMemo(
    () => ds.contentTypes.filter((t) => !platforms.length || t.platforms.some((p) => platforms.includes(p))),
    [ds.contentTypes, platforms],
  )

  const submit = () => {
    const label = title.trim() || customName.trim() || 'Untitled'
    if (intent === 'type') {
      addCustomType({
        id: `custom-${Date.now()}`,
        name: customName.trim() || 'Custom type',
        icon: 'Layers',
        format: customFormat,
        platforms: (platforms as PlatformId[]).length ? (platforms as PlatformId[]) : ['youtube'],
        workflow: ['idea', 'research', 'brief', 'scripting', 'production', 'review', 'published'],
        fields: customFields,
        color: '#A78BFA',
        custom: true,
        description: 'Custom type defined in the workspace.',
      })
      pushToast({ kind: 'success', title: `${customName || 'Custom type'} created`, body: 'It is now available in every content picker.' })
    } else if (intent === 'idea') {
      pushToast({
        kind: 'success',
        title: 'Idea captured',
        body: `“${label}” is in the vault with a provisional index score.`,
        action: { label: 'Open idea vault', run: () => navigate('/ideas') },
      })
    } else if (intent === 'asset') {
      pushToast({ kind: 'success', title: 'Upload queued', body: `${label} is being indexed and thumbnailed.` })
    } else if (intent === 'research') {
      pushToast({ kind: 'success', title: 'Research note saved', body: 'Linked to the topics you selected.' })
    } else if (intent === 'campaign') {
      pushToast({ kind: 'success', title: 'Campaign created', body: `${label} is now tracking its own KPI.` })
    } else {
      pushToast({
        kind: 'success',
        title: intent === 'script' ? 'Script workspace ready' : 'Content created',
        body: `“${label}” starts at the Idea stage with a full checklist.`,
        action: { label: 'Open content', run: () => navigate('/content') },
      })
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={intent === 'type' ? 'Create a custom content type' : 'Create'}
      description={
        intent === 'type'
          ? 'Define the fields and workflow. Creator OS treats custom types exactly like native ones.'
          : 'Everything you create enters the same pipeline: idea → research → brief → script → production → publish → analyse.'
      }
      size={intent === 'type' ? 'lg' : 'md'}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Check />} onClick={submit} disabled={intent === 'type' ? !customName.trim() : !title.trim()}>
            {intent === 'idea' ? 'Capture idea' : intent === 'type' ? 'Create type' : 'Create'}
          </Button>
        </>
      }
    >
      {step === 'pick' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {INTENTS.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                setIntent(it.id)
                setStep('form')
              }}
              className="group flex items-start gap-3 rounded-xl border border-line-2 bg-white/[0.014] p-3 text-left transition-all duration-200 hover:border-line-3 hover:bg-white/[0.035]"
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors"
                style={{ borderColor: `${it.accent}44`, background: `${it.accent}16`, color: it.accent }}
              >
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-ink-hi">{it.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-low">{it.body}</span>
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setIntent('type')
              setStep('form')
            }}
            className="group flex items-start gap-3 rounded-xl border border-violet/25 bg-violet/[0.055] p-3 text-left transition-all duration-200 hover:border-violet/45 hover:bg-violet/[0.09] sm:col-span-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-violet/40 bg-violet/15 text-violet">
              <Layers />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium text-ink-hi">Create custom content type</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-low">
                Podcast, newsletter, case study, course, thread — define your own fields, workflow and statuses.
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Badge tone="accent" size="xs">
              {intent === 'type' ? 'Custom type' : INTENTS.find((i) => i.id === intent)?.label}
            </Badge>
            {INTENTS.length > 0 && (
              <button onClick={() => setStep('pick')} className="text-[11px] text-ink-low transition-colors hover:text-ink">
                Change
              </button>
            )}
          </div>

          {intent === 'type' ? (
            <>
              <Field label="Type name">
                <Input autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Podcast Episode, Course Lesson, Thread" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Base format">
                  <Select value={customFormat} onChange={(e) => setCustomFormat(e.target.value as ContentFormatId)}>
                    {['long-form', 'short', 'reel', 'carousel', 'text', 'story', 'thread', 'podcast', 'newsletter'].map((f) => (
                      <option key={f} value={f}>
                        {f.replace('-', ' ')}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Platform">
                  <Combobox
                    multiple
                    options={ds.platforms.map((p) => ({ value: p.id, label: p.name, color: p.color, hint: p.status === 'planned' ? 'planned' : undefined }))}
                    value={platforms}
                    onChange={setPlatforms}
                    placeholder="Any platform"
                  />
                </Field>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="cell-label">Custom fields</span>
                  <button
                    onClick={() => setCustomFields((f) => [...f, { id: `f-${Date.now()}`, label: '', type: 'text' }])}
                    className="inline-flex items-center gap-1 text-[11px] text-accent transition-colors hover:text-accent-bright"
                  >
                    <Plus className="h-3 w-3" /> Add field
                  </button>
                </div>
                {customFields.length === 0 && (
                  <p className="rounded-lg border border-dashed border-line-2 px-3 py-4 text-center text-[11.5px] text-ink-faint">
                    No custom fields yet. Native fields (title, status, publish date) are always available.
                  </p>
                )}
                <div className="space-y-2">
                  {customFields.map((f, i) => (
                    <div key={f.id} className="flex gap-2">
                      <Input
                        value={f.label}
                        placeholder="Field label"
                        onChange={(e) => setCustomFields((list) => list.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))}
                      />
                      <Select
                        className="w-[132px]"
                        value={f.type}
                        onChange={(e) => setCustomFields((list) => list.map((x, j) => (i === j ? { ...x, type: e.target.value as 'text' } : x)))}
                      >
                        {['text', 'number', 'date', 'select', 'checkbox'].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label={intent === 'idea' ? 'Idea title' : intent === 'campaign' ? 'Campaign name' : intent === 'asset' ? 'Asset name' : 'Title'}>
                <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(intent)} />
              </Field>

              {intent !== 'asset' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Platform">
                    <Combobox
                      multiple
                      options={ds.platforms
                        .filter((p) => p.status === 'live')
                        .map((p) => ({ value: p.id, label: p.name, color: p.color }))}
                      value={platforms}
                      onChange={setPlatforms}
                    />
                  </Field>
                  <Field label={intent === 'idea' ? 'Format' : 'Content type'}>
                    {intent === 'idea' ? (
                      <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                        {ds.contentTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                        {(contentForPlatform.length ? contentForPlatform : ds.contentTypes).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.custom ? ' · custom' : ''}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
              )}

              {intent !== 'asset' && (
                <Field label="Topic">
                  <Combobox
                    options={ds.topics.map((t) => ({ value: t.id, label: t.name, color: t.color, group: t.parentId ? 'Topics' : 'Pillars' }))}
                    value={[topicId]}
                    onChange={(v) => setTopicId(v[0] ?? '')}
                  />
                </Field>
              )}

              {intent === 'idea' && (
                <Field label="Hook" hint="One sentence that earns the click. Write it badly now, sharpen later.">
                  <Textarea rows={2} value={hook} onChange={(e) => setHook(e.target.value)} placeholder="What is the sharpest version of this idea?" />
                </Field>
              )}

              {(intent === 'script' || intent === 'content' || intent === 'research' || intent === 'campaign') && (
                <Field label={intent === 'research' ? 'Summary' : intent === 'campaign' ? 'Objective' : 'Working notes'}>
                  <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={notesPlaceholder(intent)} />
                </Field>
              )}

              {intent === 'content' && (
                <Panel className="border-line-1 bg-white/[0.014] p-3">
                  <p className="flex items-center gap-1.5 text-[11.5px] text-ink-mid">
                    <Wand2 className="h-3.5 w-3.5 text-accent" />
                    Creator OS will scaffold a brief, a script outline and the 12-point production checklist from the type template.
                  </p>
                </Panel>
              )}

              {intent === 'asset' && (
                <div className="rounded-xl border border-dashed border-line-3 bg-white/[0.014] p-6 text-center">
                  <Upload className="mx-auto h-5 w-5 text-ink-low" />
                  <p className="mt-2 text-[12px] text-ink-mid">Drop files here or browse</p>
                  <p className="mt-0.5 text-[10.5px] text-ink-faint">Video, image, audio, PDF, Figma, ZIP — up to 20 GB per file</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="cell-label mb-1.5 flex items-baseline justify-between">
        {label}
        {hint && <span className="normal-case tracking-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function placeholderFor(intent: string) {
  switch (intent) {
    case 'idea':
      return 'e.g. I gave my agent a credit card with a $50 limit'
    case 'campaign':
      return 'e.g. AgentKit Launch'
    case 'research':
      return 'e.g. Chunking strategy beats embedding model choice'
    case 'asset':
      return 'e.g. broll-mumbai-office.mp4'
    case 'script':
      return 'e.g. Why your agent fails in production'
    default:
      return 'e.g. I Replaced My Entire Analytics Stack'
  }
}

function notesPlaceholder(intent: string) {
  switch (intent) {
    case 'research':
      return 'What does this source actually claim, and how confident are you?'
    case 'campaign':
      return 'What has to be true for this campaign to have worked?'
    default:
      return 'Angles, constraints, references — the messy first thinking.'
  }
}
