import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================================
   PAGE SCAFFOLD
   Every screen shares this frame but sets its own rhythm: the `bleed` and
   `width` props let analytical screens run full-bleed while editorial screens
   stay measured. This is what stops 15 pages looking identical.
   ========================================================================== */

export function Page({
  children,
  className,
  width = 'wide',
  bleed,
}: {
  children: ReactNode
  className?: string
  width?: 'narrow' | 'default' | 'wide' | 'full'
  bleed?: boolean
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        width === 'narrow' && 'max-w-[880px]',
        width === 'default' && 'max-w-[1280px]',
        width === 'wide' && 'max-w-[1720px]',
        width === 'full' && 'max-w-none',
        bleed ? 'px-0 py-0' : 'px-4 py-5 lg:px-6 lg:py-6',
        'pb-24 lg:pb-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
  sticky,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
  sticky?: boolean
}) {
  return (
    <header className={cn('mb-5', sticky && 'sticky top-0 z-10 -mx-4 mb-4 border-b border-line-2 bg-base/85 px-4 py-3 backdrop-blur-xl lg:-mx-6 lg:px-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-px w-4 bg-accent/60" />
              <span className="cell-label text-accent/90">{eyebrow}</span>
            </div>
          )}
          <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.024em] text-ink-hi">{title}</h1>
          {description && <p className="mt-1.5 max-w-[78ch] text-[12.5px] leading-relaxed text-ink-low">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {meta && <div className="mt-3.5">{meta}</div>}
    </header>
  )
}

/** Dense metric strip — the alternative to a wall of identical cards. */
export function MetricStrip({
  items,
  className,
  columns,
}: {
  items: { label: string; value: ReactNode; delta?: ReactNode; hint?: ReactNode; accent?: string }[]
  className?: string
  columns?: string
}) {
  return (
    <div
      className={cn('grid divide-x divide-[var(--color-line-1)] overflow-hidden rounded-xl border border-line-2 bg-panel', className)}
      style={{ gridTemplateColumns: columns ?? `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
    >
      {items.map((m, i) => (
        <div key={i} className="min-w-0 px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            {m.accent && <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.accent }} />}
            <p className="cell-label truncate">{m.label}</p>
          </div>
          <p className="tnum mt-1.5 truncate text-[19px] font-semibold leading-none tracking-[-0.02em] text-ink-hi">{m.value}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {m.delta}
            {m.hint && <span className="truncate text-[10.5px] text-ink-faint">{m.hint}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Two-column analytical split used across dashboard and analytics. */
export function SplitGrid({
  children,
  className,
  ratio = 'wide',
  gap = 'md',
}: {
  children: ReactNode
  className?: string
  ratio?: 'wide' | 'even' | 'narrow'
  gap?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div
      className={cn(
        'grid min-w-0',
        gap === 'sm' ? 'gap-2.5' : gap === 'lg' ? 'gap-5' : 'gap-3.5',
        ratio === 'even' ? 'xl:grid-cols-2' : ratio === 'wide' ? 'xl:grid-cols-[1.62fr_1fr]' : 'xl:grid-cols-[1fr_1.62fr]',
        className,
      )}
    >
      {children}
    </div>
  )
}
