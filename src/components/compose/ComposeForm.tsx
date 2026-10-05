import { useId, useState } from 'react'
import { AlertTriangle, Paperclip, X } from 'lucide-react'
import { Input, Textarea, Switch } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { fieldsFor, toolkitDef } from '@/integrations/registry'
import type { ComposeField, ToolkitId } from '@/integrations/types'
import { parseTags, textLength, type Problem } from '@/integrations/validate'

/* ============================================================================
   COMPOSE FORM
   Rendered entirely from the toolkit definition, so a platform's fields,
   limits and hints are declared once in the registry and enforced everywhere
   — the form, the validator, the preview and the pre-flight check all read
   the same source. Adding a field to a platform is a one-line change.
   ========================================================================== */

export type DraftValues = Record<string, string | string[] | boolean>

export function ComposeForm({
  toolkit,
  mediaType,
  values,
  onChange,
  problems,
  disabled,
}: {
  toolkit: ToolkitId
  mediaType: string
  values: DraftValues
  onChange: (next: DraftValues) => void
  problems: Problem[]
  disabled?: boolean
}) {
  const fields = fieldsFor(toolkit, mediaType)
  const set = (id: string, v: string | string[] | boolean) => onChange({ ...values, [id]: v })

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <Field
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(v) => set(field.id, v)}
          problem={problems.find((p) => p.fieldId === field.id)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
  problem,
  disabled,
}: {
  field: ComposeField
  value: string | string[] | boolean | undefined
  onChange: (v: string | string[] | boolean) => void
  problem?: Problem
  disabled?: boolean
}) {
  const id = useId()
  const len = textLength(value)
  const over = field.limit ? len > field.limit : false
  const pastRecommended = field.recommended ? len > field.recommended : false
  const error = problem?.severity === 'error'

  /* A toggle carries its own label and description, so it renders bare —
     wrapping it in another label row duplicated both. */
  if (field.kind === 'toggle') {
    return (
      <div className={cn(disabled && 'pointer-events-none opacity-50')}>
        <Switch checked={value === true} onChange={onChange} label={field.label} description={field.hint} />
      </div>
    )
  }

  return (
    <div className={cn(disabled && 'pointer-events-none opacity-50')}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-hi">
          {field.label}
          {field.required && <span className="text-accent/70">*</span>}
        </label>
        {field.limit ? (
          <span
            className={cn(
              'mono text-[10px]',
              over ? 'text-rose' : pastRecommended ? 'text-amber' : 'text-ink-faint',
            )}
          >
            {len.toLocaleString()} / {field.limit.toLocaleString()}
          </span>
        ) : field.maxItems && Array.isArray(value) ? (
          <span className={cn('mono text-[10px]', value.length > field.maxItems ? 'text-rose' : 'text-ink-faint')}>
            {value.length} / {field.maxItems}
          </span>
        ) : null}
      </div>

      <Control field={field} id={id} value={value} onChange={onChange} invalid={error} />

      {(problem || field.hint) && (
        <p
          className={cn(
            'mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed',
            error ? 'text-rose' : problem?.severity === 'warn' ? 'text-amber' : 'text-ink-faint',
          )}
        >
          {error && <AlertTriangle className="mt-px h-3 w-3 shrink-0" />}
          <span>{problem ? `${problem.label} ${problem.message}.` : field.hint}</span>
        </p>
      )}
    </div>
  )
}

function Control({
  field,
  id,
  value,
  onChange,
  invalid,
}: {
  field: ComposeField
  id: string
  value: string | string[] | boolean | undefined
  onChange: (v: string | string[] | boolean) => void
  invalid?: boolean
}) {
  switch (field.kind) {
    case 'text':
      return (
        <Input
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          invalid={invalid}
        />
      )

    case 'textarea':
      return (
        <Textarea
          id={id}
          rows={field.limit && field.limit > 1500 ? 9 : 5}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(invalid && 'border-rose/50')}
        />
      )

    case 'tags':
      return <TagsInput id={id} value={Array.isArray(value) ? value : []} onChange={onChange} placeholder={field.placeholder ?? 'Type and press Enter'} invalid={invalid} />

    case 'select':
      return <OptionRow id={id} options={field.options ?? []} value={typeof value === 'string' ? value : ''} onChange={onChange} invalid={invalid} />

    case 'media':
      return <MediaInput id={id} value={typeof value === 'string' ? value : ''} onChange={onChange} invalid={invalid} />

    case 'datetime':
      return (
        <Input
          id={id}
          type="datetime-local"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn('mono', invalid && 'border-rose/50')}
        />
      )

    default:
      return null
  }
}

/* --- tags ------------------------------------------------------------------ */

function TagsInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  invalid?: boolean
}) {
  const [draft, setDraft] = useState('')
  const commit = (raw: string) => {
    const next = parseTags(raw)
    if (!next.length) return
    const merged = [...value, ...next.filter((t) => !value.includes(t))]
    onChange(merged)
  }

  return (
    <div
      className={cn(
        'flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-md border border-line-2 bg-surface-1 px-2 py-1.5 transition-colors focus-within:border-accent/45',
        invalid && 'border-rose/50',
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded border border-line-3 bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-ink-mid">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-ink-faint transition-colors hover:text-rose"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[120px] flex-1 bg-transparent text-[12px] text-ink-hi outline-none placeholder:text-ink-ghost"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit(draft)
            setDraft('')
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft)
          setDraft('')
        }}
      />
    </div>
  )
}

/* --- select ---------------------------------------------------------------- */

function OptionRow({
  id,
  options,
  value,
  onChange,
  invalid,
}: {
  id: string
  options: { id: string; label: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  invalid?: boolean
}) {
  return (
    <div id={id} role="radiogroup" className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            title={o.hint}
            className={cn(
              'rounded-md border px-2.5 py-1.5 text-left text-[11.5px] transition-colors duration-150',
              active
                ? 'border-accent/40 bg-accent/12 text-accent-ink'
                : 'border-line-2 bg-surface-1 text-ink-mid hover:border-line-3 hover:bg-white/[0.04]',
              invalid && !active && 'border-rose/30',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* --- media ----------------------------------------------------------------- */

function MediaInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste a URL, or pick an asset…"
          icon={<Paperclip className="h-3 w-3" />}
          invalid={invalid}
          className="min-w-0 flex-1"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-md border border-line-2 px-2 text-ink-low transition-colors hover:border-line-3 hover:text-ink"
            aria-label="Clear media"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {value && (
        <div className="overflow-hidden rounded-md border border-line-2 bg-surface-1">
          <img src={value} alt="" className="max-h-[120px] w-full object-cover" loading="lazy" />
        </div>
      )}
    </div>
  )
}

/* --- prefills -------------------------------------------------------------- */

/** Copy shared source material into a platform's fields, adapting the shape
    rather than pasting the same text everywhere. */
export function adaptFromSource(
  toolkit: ToolkitId,
  mediaType: string,
  source: { hook: string; body: string; cta: string; tags: string[] },
  existing: DraftValues,
): DraftValues {
  const next: DraftValues = { ...existing }
  const tags = source.tags.slice(0, toolkit === 'instagram' ? 30 : 15)

  if (toolkit === 'youtube') {
    if (!next.title && source.hook) next.title = source.hook.slice(0, 100)
    if (!next.description || next.description === '') {
      next.description = [source.body, source.cta].filter(Boolean).join('\n\n').slice(0, 5000)
    }
    if ((!next.tags || (next.tags as string[]).length === 0) && tags.length) next.tags = tags
    return next
  }

  if (toolkit === 'instagram') {
    if (!next.caption) next.caption = [source.hook, source.body].filter(Boolean).join('\n\n').slice(0, 2200)
    if ((!next.hashtags || (next.hashtags as string[]).length === 0) && tags.length) next.hashtags = tags
    return next
  }

  if (!next.commentary) {
    next.commentary = [source.hook, source.body, source.cta].filter(Boolean).join('\n\n').slice(0, 3000)
  }
  return next
}

/** Suggest media types that make sense for a given content format. */
export function mediaLabel(toolkit: ToolkitId, mediaType: string): string {
  const labels: Record<string, string> = {
    video: 'Long-form video',
    short: 'Short',
    reel: 'Reel',
    image: 'Image post',
    carousel: 'Carousel',
    story: 'Story',
    text: 'Text post',
    document: 'Document',
  }
  return labels[mediaType] ?? toolkitDef(toolkit).publishNoun
}
