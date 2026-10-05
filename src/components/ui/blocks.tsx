import type { ReactNode } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ============================================================================
   COMPOSITE BLOCKS

   Small, opinionated containers that absorb markup every screen was rebuilding
   by hand. Each one existed as an identical literal in four or more places
   before it was lifted here — this is consolidation, not redesign: the pixels
   are unchanged, the duplication is gone.

   · DescriptionList — the two-column key/value grid with its hairline
   · Inset           — a nested surface one step below a Panel
   · StickyActions   — the pinned footer bar inside a drawer
   · CheckRow        — the done/pending row used by checklists and deliverables
   · EntityRow       — dot + title + trailing meta, the most repeated row we had
   ========================================================================== */

export function DescriptionList({
  children,
  className,
  columns = 2,
  divider = false,
  padded,
}: {
  children: ReactNode
  className?: string
  columns?: 2 | 3 | 4
  /** Draw the hairline above the block — used when it follows other content. */
  divider?: boolean
  /** Add panel gutters, for the case where the list is a panel's only child. */
  padded?: boolean
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-x-4 gap-y-3.5',
        cols,
        divider && 'border-t border-line-2 pt-4',
        divider && !padded && 'mt-4',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </dl>
  )
}

/** A surface one step below the panel it sits in. Never decoration — it marks
    a genuine sub-group, such as a nested note or a derived figure. */
export function Inset({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'li' }) {
  return <Tag className={cn('rounded-lg border border-line-2 bg-white/[0.016] p-3', className)}>{children}</Tag>
}

/** The pinned action bar at the foot of a drawer or sheet. */
export function StickyActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('sticky bottom-0 -mx-4 mt-5 flex items-center gap-2 border-t border-line-2 bg-surface-1/95 px-4 py-3 backdrop-blur-xl', className)}>
      {children}
    </div>
  )
}

export function CheckRow({
  done,
  label,
  meta,
  metaTone = 'muted',
  onClick,
  className,
}: {
  done: boolean
  label: ReactNode
  meta?: ReactNode
  metaTone?: 'muted' | 'warn'
  onClick?: () => void
  className?: string
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border border-line-2 px-2.5 py-2 text-left',
        onClick && 'transition-colors hover:border-line-3 hover:bg-white/[0.03]',
        className,
      )}
    >
      <span
        className={cn(
          'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border',
          done ? 'border-emerald/45 bg-emerald/15' : 'border-line-3',
        )}
      >
        {done && <Check className="h-3 w-3 text-emerald" />}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-[11.5px]', done ? 'text-ink-low line-through decoration-line-3' : 'text-ink')}>
        {label}
      </span>
      {meta && (
        <span className={cn('mono shrink-0 text-[9.5px]', metaTone === 'warn' ? 'text-rose' : 'text-ink-faint')}>{meta}</span>
      )}
    </Tag>
  )
}

export function EntityRow({
  color,
  title,
  sub,
  trailing,
  onClick,
  className,
  arrow,
}: {
  /** A 1px dot in the entity's colour — cheaper than a badge in dense lists. */
  color?: string
  title: ReactNode
  sub?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
  arrow?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border border-line-2 px-2.5 py-2 text-left',
        onClick && 'transition-colors hover:border-line-3 hover:bg-white/[0.03]',
        className,
      )}
    >
      {color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] text-ink">{title}</span>
        {sub && <span className="mono block truncate text-[9.5px] text-ink-faint">{sub}</span>}
      </span>
      {trailing}
      {arrow && <ChevronRight className="h-3 w-3 shrink-0 text-ink-ghost" />}
    </Tag>
  )
}
