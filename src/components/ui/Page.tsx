import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ============================================================================
   PAGE SCAFFOLD
   Every screen shares this frame but sets its own rhythm: the `width` prop lets
   analytical screens run full-bleed while editorial screens stay measured, and
   `gap` sets the vertical beat between blocks. This is what stops 15 pages
   looking identical.

   Breakpoint behaviour is deliberate:
     · under 640px  — single column, tighter gutters, bottom-nav clearance
     · 640–1023px   — two-up grids, condensed gutters (tablet)
     · 1024px+      — the editorial desktop composition
   ========================================================================== */

const WIDTHS = {
  narrow: 'max-w-[880px]',
  default: 'max-w-[1240px]',
  wide: 'max-w-[1720px]',
  full: 'max-w-none',
} as const

export function Page({
  children,
  className,
  width = 'wide',
  bleed,
  gap = 'md',
}: {
  children: ReactNode
  className?: string
  width?: 'narrow' | 'default' | 'wide' | 'full'
  bleed?: boolean
  gap?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        WIDTHS[width],
        bleed ? 'px-0 py-0' : 'px-3.5 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6',
        gap === 'sm' ? 'space-y-3' : gap === 'lg' ? 'space-y-6' : 'space-y-4 lg:space-y-5',
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
    <header
      className={cn(
        'mb-4 lg:mb-5',
        sticky &&
          'sticky top-0 z-20 -mx-3.5 mb-4 border-b border-line-2 bg-base/80 px-3.5 py-3 backdrop-blur-xl sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-accent/70 to-accent/10" />
              <span className="cell-label text-accent/90">{eyebrow}</span>
            </div>
          )}
          <h1 className="title-1 truncate">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-[82ch] text-[12.5px] leading-relaxed text-ink-low">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>
        )}
      </div>
      {meta && <div className="mt-3.5">{meta}</div>}
    </header>
  )
}

/**
 * Dense metric strip — the alternative to a wall of identical cards. Built on a
 * 1px grid so the hairlines are perfect in every layout: two columns on phones,
 * up to four on tablets and up. Empty tail cells are filled with plain surfaces
 * so a partial row never shows a lighter block.
 */
export function MetricStrip({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; delta?: ReactNode; hint?: ReactNode; accent?: string }[]
  className?: string
}) {
  const cols = Math.min(items.length, 4)
  const mobileFillers = items.length % 2
  const mdFillers = (cols - (items.length % cols)) % cols

  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border border-line-2 bg-[var(--color-line-1)]',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.022)]',
        'grid-cols-2 md:[grid-template-columns:repeat(var(--strip-cols),minmax(0,1fr))]',
        className,
      )}
      style={{ ['--strip-cols' as string]: cols }}
    >
      {items.map((m, i) => (
        <div key={i} className="group/strip relative min-w-0 bg-panel px-3.5 py-3 transition-colors duration-[var(--duration-2)] hover:bg-surface-1">
          <div className="flex items-center gap-1.5">
            {m.accent && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.accent, boxShadow: `0 0 8px ${m.accent}80` }} />
            )}
            <p className="cell-label truncate">{m.label}</p>
          </div>
          <p className="num mt-1.5 truncate text-[19px] leading-none">{m.value}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {m.delta}
            {m.hint && <span className="truncate text-[10.5px] text-ink-faint">{m.hint}</span>}
          </div>
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-accent/70 to-transparent transition-transform duration-[var(--duration-4)] ease-[var(--ease-out-quint)] group-hover/strip:scale-x-100"
            aria-hidden
          />
        </div>
      ))}
      {/* Tail cells keep the hairline grid honest when the count does not divide evenly. */}
      {Array.from({ length: mobileFillers }).map((_, i) => (
        <div key={`mf-${i}`} className="bg-panel md:hidden" aria-hidden />
      ))}
      {Array.from({ length: mdFillers }).map((_, i) => (
        <div key={`df-${i}`} className="hidden bg-panel md:block" aria-hidden />
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
        ratio === 'even'
          ? 'lg:grid-cols-2'
          : ratio === 'wide'
            ? 'lg:grid-cols-[1.6fr_1fr]'
            : 'lg:grid-cols-[1fr_1.6fr]',
        className,
      )}
    >
      {children}
    </div>
  )
}
