import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDismiss } from '@/lib/hooks'
import { IconButton } from './Button'

/* ============================================================================
   OVERLAYS
   Popovers, modal and drawer share one motion contract: 200–260ms, the same
   easing curve, and an origin that communicates where the surface came from.
   ========================================================================== */

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  side = 'bottom',
  width,
  className,
  contentClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  open?: boolean
  onOpenChange?: (v: boolean) => void
  align?: 'start' | 'center' | 'end'
  side?: 'bottom' | 'top'
  width?: number | string
  className?: string
  contentClassName?: string
}) {
  const [internal, setInternal] = useState(false)
  const isOpen = open ?? internal
  const setOpen = useCallback(
    (v: boolean) => {
      if (open === undefined) setInternal(v)
      onOpenChange?.(v)
    },
    [open, onOpenChange],
  )
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const ref = useDismiss<HTMLDivElement>(isOpen, () => setOpen(false))

  return (
    <div
      ref={(node) => {
        ref.current = node
        anchorRef.current = node
      }}
      className={cn('relative', className)}
    >
      {trigger({ open: isOpen, toggle: () => setOpen(!isOpen) })}
      {isOpen &&
        createPortal(
          <div className="fixed z-[110]" style={anchorStyle(anchorRef.current, align, side, width)} role="dialog">
            <div
              className={cn(
                'relative overflow-hidden rounded-xl border border-line-3 bg-surface-2/97 shadow-[0_28px_70px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl',
                'animate-[pop_180ms_var(--ease-cockpit)_both]',
                side === 'bottom' ? 'origin-top' : 'origin-bottom',
                contentClassName,
              )}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" aria-hidden />
              {typeof children === 'function' ? children(() => setOpen(false)) : children}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function anchorStyle(el: HTMLElement | null, align: 'start' | 'center' | 'end', side: 'bottom' | 'top', width?: number | string): React.CSSProperties {
  if (!el || typeof window === 'undefined') return { display: 'none' }
  const r = el.getBoundingClientRect()
  const gap = 7
  const w = width ?? Math.max(r.width, 220)
  let left = align === 'start' ? r.left : align === 'end' ? r.right - (typeof w === 'number' ? w : 0) : r.left + r.width / 2
  const top = side === 'bottom' ? r.bottom + gap : r.top - gap
  if (typeof w === 'number') {
    const maxLeft = window.innerWidth - w - 12
    left = Math.max(12, Math.min(left, maxLeft))
  }
  return {
    left,
    top,
    width: typeof w === 'number' ? w : undefined,
    transform: side === 'top' ? 'translateY(-100%)' : undefined,
    ...(align === 'center' ? { transform: `translateX(-50%)${side === 'top' ? ' translateY(-100%)' : ''}` } : {}),
  }
}

/* -------------------------------------------------------------------------- */
/* MODAL                                                                       */
/* -------------------------------------------------------------------------- */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const widths = { sm: 'max-w-[420px]', md: 'max-w-[560px]', lg: 'max-w-[760px]', xl: 'max-w-[1040px]', full: 'max-w-[1360px]' }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 animate-[fade-in_200ms_var(--ease-cockpit)_both] bg-black/62 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative my-auto w-full animate-[rise_260ms_var(--ease-cockpit)_both] rounded-2xl border border-line-3 bg-surface-1/98 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.98)]',
          widths[size],
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" aria-hidden />
        {(title || description) && (
          <header className="flex items-start justify-between gap-4 border-b border-line-2 px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-ink-hi">{title}</h2>}
              {description && <p className="mt-1 text-[12px] leading-relaxed text-ink-low">{description}</p>}
            </div>
            <IconButton label="Close" icon={<X />} onClick={onClose} side="left" />
          </header>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line-2 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/* DRAWER                                                                      */
/* -------------------------------------------------------------------------- */
export function Drawer({
  open,
  onClose,
  side = 'right',
  width = 420,
  children,
  title,
  className,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  side?: 'right' | 'left' | 'bottom'
  width?: number
  children: ReactNode
  title?: ReactNode
  className?: string
  labelledBy?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const isBottom = side === 'bottom'

  return createPortal(
    <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 animate-[fade-in_200ms_var(--ease-cockpit)_both] bg-black/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'absolute border-line-3 bg-surface-1/98 shadow-[0_0_80px_-10px_rgba(0,0,0,0.95)]',
          isBottom
            ? 'inset-x-0 bottom-0 max-h-[86vh] animate-[rise_280ms_var(--ease-cockpit)_both] rounded-t-2xl border-t'
            : side === 'right'
              ? 'inset-y-0 right-0 animate-[slide-left_280ms_var(--ease-cockpit)_both] border-l'
              : 'inset-y-0 left-0 animate-[slide-right_280ms_var(--ease-cockpit)_both] border-r',
          className,
        )}
        style={isBottom ? undefined : { width }}
      >
        {title && (
          <header className="flex items-center justify-between gap-3 border-b border-line-2 px-4 py-3">
            <h2 className="text-[13px] font-semibold tracking-[-0.012em] text-ink-hi">{title}</h2>
            <IconButton label="Close" icon={<X />} onClick={onClose} side="left" />
          </header>
        )}
        {children}
      </div>
      <style>{`
        @keyframes slide-left { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: none; } }
        @keyframes slide-right { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/* MENU                                                                        */
/* -------------------------------------------------------------------------- */
export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  hint?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  onSelect?: () => void
  /** Render a separator before this item. */
  separatorBefore?: boolean
}

export function Menu({
  items,
  className,
  onSelect,
}: {
  items: MenuItem[]
  className?: string
  onSelect?: (id: string) => void
}) {
  return (
    <div role="menu" className={cn('min-w-[210px] p-1', className)}>
      {items.map((item) => (
        <div key={item.id}>
          {item.separatorBefore && <div className="my-1 h-px bg-line-2" />}
          <button
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect?.()
              onSelect?.(item.id)
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors duration-150',
              'disabled:pointer-events-none disabled:opacity-35',
              item.danger ? 'text-rose hover:bg-rose/12' : 'text-ink hover:bg-white/[0.06] hover:text-ink-hi',
            )}
          >
            {item.icon && <span className="shrink-0 opacity-75 [&>svg]:h-3.5 [&>svg]:w-3.5">{item.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.hint && <span className="mono shrink-0 text-[10px] text-ink-faint">{item.hint}</span>}
            {item.shortcut && <span className="mono shrink-0 text-[10px] text-ink-faint">{item.shortcut}</span>}
          </button>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* TOAST HOST                                                                  */
/* -------------------------------------------------------------------------- */
export function ToastHost({ toasts, onDismiss }: { toasts: { id: string; kind: string; title: string; body?: string; action?: { label: string; run: () => void } }[]; onDismiss: (id: string) => void }) {
  const tone: Record<string, string> = {
    success: 'border-emerald/30',
    info: 'border-accent/30',
    warn: 'border-amber/30',
    error: 'border-rose/35',
  }
  const dot: Record<string, string> = { success: '#34D399', info: '#5B9DFF', warn: '#FBBF24', error: '#FB7185' }
  const dismiss = useCallback((id: string) => onDismiss(id), [onDismiss])

  if (!toasts.length) return null
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[160] flex w-[340px] flex-col gap-2" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto animate-[toast-in_300ms_var(--ease-cockpit)_both] rounded-xl border bg-surface-2/97 p-3 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.95)] backdrop-blur-xl',
            'transition-transform duration-[var(--duration-2)] ease-[var(--ease-cockpit)] hover:-translate-y-px',
            tone[t.kind] ?? 'border-line-3',
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot[t.kind] ?? '#5B9DFF', boxShadow: `0 0 8px ${dot[t.kind] ?? '#5B9DFF'}` }} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-ink-hi">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-low">{t.body}</p>}
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.run()
                    dismiss(t.id)
                  }}
                  className="mt-2 text-[11.5px] font-medium text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent-bright hover:decoration-accent"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}
