import {
  forwardRef,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDismiss } from '@/lib/hooks'

/* ============================================================================
   FORM PRIMITIVES
   The visual contract: a single hairline border, ink-mid placeholder, and an
   accent ring on focus that matches the JARVIS glow language.
   ========================================================================== */

const FIELD_BASE =
  'w-full bg-white/[0.026] border border-line-2 rounded-lg text-ink-hi placeholder:text-ink-faint ' +
  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.018)] ' +
  'transition-[border-color,background-color,box-shadow] duration-[var(--duration-2)] ease-[var(--ease-cockpit)] ' +
  'hover:border-line-3 hover:bg-white/[0.04] ' +
  'focus:outline-none focus:border-accent/55 focus:bg-white/[0.048] ' +
  'focus:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02),0_0_0_3px_rgba(91,157,255,0.14),0_0_22px_-8px_rgba(91,157,255,0.7)] ' +
  'disabled:opacity-45 disabled:pointer-events-none'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; suffix?: ReactNode; invalid?: boolean }>(
  function Input({ className, icon, suffix, invalid, ...rest }, ref) {
    return (
      <div className="relative flex items-center">
        {icon && <span className="pointer-events-none absolute left-2.5 text-ink-faint [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            FIELD_BASE,
            'h-8.5 px-2.5 text-[12.5px]',
            icon && 'pl-8',
            suffix && 'pr-8',
            invalid && 'border-rose/50 focus:border-rose/70 focus:shadow-[0_0_0_3px_rgba(251,113,133,0.14)]',
            className,
          )}
          {...rest}
        />
        {suffix && <span className="absolute right-2.5 text-ink-faint [&>svg]:h-3.5 [&>svg]:w-3.5">{suffix}</span>}
      </div>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(FIELD_BASE, 'resize-none px-2.5 py-2 text-[12.5px] leading-relaxed', className)} {...rest} />
})

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }>(
  function SearchInput({ className, onClear, value, ...rest }, ref) {
    return (
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-faint" aria-hidden />
        <input
          ref={ref}
          value={value}
          className={cn(FIELD_BASE, 'h-8.5 pl-8 pr-8 text-[12.5px]', className)}
          {...rest}
        />
        {!!value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 rounded p-0.5 text-ink-low transition-colors hover:bg-white/[0.07] hover:text-ink-hi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  },
)

/* -------------------------------------------------------------------------- */
/* NATIVE SELECT                                                               */
/* -------------------------------------------------------------------------- */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }>(
  function Select({ className, children, compact, ...rest }, ref) {
    return (
      <div className="relative flex items-center">
        <select
          ref={ref}
          className={cn(
            FIELD_BASE,
            'cursor-pointer appearance-none pr-8',
            compact ? 'h-7.5 pl-2.5 text-[11.5px]' : 'h-8.5 pl-2.5 text-[12.5px]',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-low" aria-hidden />
      </div>
    )
  },
)

/* -------------------------------------------------------------------------- */
/* COMBOBOX                                                                    */
/* -------------------------------------------------------------------------- */
export interface ComboOption {
  value: string
  label: string
  hint?: string
  color?: string
  group?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  multiple = false,
  className,
  emptyLabel = 'No matches',
}: {
  options: ComboOption[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  multiple?: boolean
  className?: string
  emptyLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
  }, [options, query])

  const selectedLabels = options.filter((o) => value.includes(o.value))
  const label =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0].label
        : `${selectedLabels[0].label} +${selectedLabels.length - 1}`

  const toggle = (v: string) => {
    if (multiple) {
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
    } else {
      onChange(value.includes(v) ? [] : [v])
      setOpen(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ComboOption[]>()
    for (const o of filtered) {
      const g = o.group ?? ''
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(o)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          FIELD_BASE,
          'flex h-8.5 items-center justify-between gap-2 px-2.5 text-left text-[12.5px]',
          value.length === 0 && 'text-ink-faint',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selectedLabels.length === 1 && selectedLabels[0].color && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: selectedLabels[0].color }} />
          )}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-ink-low transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+5px)] z-50 w-full min-w-[220px] animate-[scale-in_150ms_var(--ease-cockpit)_both] overflow-hidden rounded-lg border border-line-3 bg-surface-2/97 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          {options.length > 8 && (
            <div className="border-b border-line-2 p-1.5">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="h-7 w-full rounded-md bg-white/[0.04] px-2 text-[12px] text-ink-hi placeholder:text-ink-faint focus:outline-none"
              />
            </div>
          )}
          <div className="max-h-[260px] overflow-y-auto p-1">
            {grouped.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-ink-low">{emptyLabel}</p>}
            {grouped.map(([group, items]) => (
              <div key={group}>
                {group && <p className="cell-label px-2 pb-1 pt-2">{group}</p>}
                {items.map((o) => {
                  const active = value.includes(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => toggle(o.value)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors duration-150',
                        active ? 'bg-accent/12 text-accent-ink' : 'text-ink hover:bg-white/[0.055]',
                      )}
                    >
                      <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border', active ? 'border-accent bg-accent/25' : 'border-line-3')}>
                        {active && <Check className="h-2.5 w-2.5 text-accent-bright" />}
                      </span>
                      {o.color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: o.color }} />}
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint && <span className="mono shrink-0 text-[10px] text-ink-low">{o.hint}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* CHECKBOX + SWITCH                                                           */
/* -------------------------------------------------------------------------- */
export function Checkbox({
  checked,
  onChange,
  label,
  count,
  className,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  count?: number
  className?: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors duration-150 hover:bg-white/[0.04]',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200',
          checked ? 'border-accent bg-accent/25 shadow-[0_0_10px_-2px_rgba(91,157,255,0.6)]' : 'border-line-3 group-hover:border-line-4',
        )}
      >
        <Check className={cn('h-3 w-3 text-accent-bright transition-opacity duration-150', checked ? 'opacity-100' : 'opacity-0')} />
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" disabled={disabled} />
      <span className={cn('min-w-0 flex-1 truncate', checked ? 'text-ink-hi' : 'text-ink')}>{label}</span>
      {count !== undefined && <span className="mono shrink-0 text-[10.5px] text-ink-low">{count}</span>}
    </label>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4 py-2', disabled && 'pointer-events-none opacity-40')}>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-ink-hi">{label}</span>
        {description && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-low">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-[18px] w-8 shrink-0 rounded-full border transition-all duration-250 ease-[var(--ease-cockpit)]',
          checked ? 'border-accent/50 bg-accent/30' : 'border-line-3 bg-white/[0.05]',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[12px] w-[12px] rounded-full transition-[left,background-color,box-shadow] duration-250 ease-[var(--ease-cockpit)]',
            checked ? 'left-[17px] bg-accent-bright shadow-[0_0_8px_rgba(91,157,255,0.8)]' : 'left-[2px] bg-ink-low',
          )}
        />
      </button>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* SEGMENTED CONTROL                                                           */
/* -------------------------------------------------------------------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className,
  ariaLabel,
}: {
  options: { id: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'xs' | 'sm' | 'md'
  className?: string
  ariaLabel?: string
}) {
  const pad = size === 'xs' ? 'h-6 px-2 text-[10.5px]' : size === 'md' ? 'h-8.5 px-3.5 text-[12.5px]' : 'h-7.5 px-2.5 text-[11.5px]'
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-line-2 bg-white/[0.025] p-0.5', className)}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              'relative rounded-[7px] font-medium transition-all duration-200 ease-[var(--ease-cockpit)]',
              pad,
              active
                ? 'bg-white/[0.085] text-ink-hi shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_6px_16px_-10px_rgba(0,0,0,0.9)]'
                : 'text-ink-low hover:bg-white/[0.04] hover:text-ink',
            )}
          >
            {o.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* SLIDER                                                                      */
/* Native range input, restyled. Used for scoring, weights and thresholds.     */
/* -------------------------------------------------------------------------- */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  ariaLabel,
  color = 'var(--color-accent)',
  className,
  ticks,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  ariaLabel: string
  color?: string
  className?: string
  ticks?: number
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={cn('group relative flex h-5 items-center', className)}>
      <span className="absolute inset-x-0 h-[3px] rounded-full bg-white/[0.07]" aria-hidden />
      <span className="absolute left-0 h-[3px] rounded-full transition-[width] duration-150" style={{ width: `${pct}%`, background: color }} aria-hidden />
      {ticks !== undefined && (
        <span className="pointer-events-none absolute inset-x-0 flex justify-between" aria-hidden>
          {Array.from({ length: ticks }).map((_, i) => (
            <span key={i} className="h-2 w-px bg-white/[0.09]" />
          ))}
        </span>
      )}
      <span
        className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-base bg-ink-hi shadow-[0_0_10px_rgba(0,0,0,0.7)] transition-transform duration-150 group-hover:scale-110"
        style={{ left: `${pct}%`, background: color }}
        aria-hidden
      />
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
