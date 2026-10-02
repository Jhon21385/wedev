import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

/* ============================================================================
   TOOLTIP
   Portal-rendered so it escapes every overflow context, positioned against the
   viewport and flipped when it would clip. Opens on hover *and* focus so it
   doubles as an accessible description for icon-only controls.
   ========================================================================== */

type Side = 'top' | 'bottom' | 'left' | 'right'

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 220,
  shortcut,
  className,
  disabled,
}: {
  content: ReactNode
  children: ReactNode
  side?: Side
  delay?: number
  shortcut?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ x: number; y: number; side: Side }>({ x: 0, y: 0, side })
  const anchor = useRef<HTMLSpanElement | null>(null)
  const timer = useRef<number | null>(null)
  const id = useId()

  const show = () => {
    if (disabled) return
    timer.current = window.setTimeout(() => {
      const el = anchor.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 9
      let resolved: Side = side
      if (side === 'top' && r.top < 44) resolved = 'bottom'
      if (side === 'bottom' && window.innerHeight - r.bottom < 44) resolved = 'top'
      if (side === 'right' && window.innerWidth - r.right < 160) resolved = 'left'
      if (side === 'left' && r.left < 160) resolved = 'right'
      const pos =
        resolved === 'top'
          ? { x: r.left + r.width / 2, y: r.top - gap }
          : resolved === 'bottom'
            ? { x: r.left + r.width / 2, y: r.bottom + gap }
            : resolved === 'left'
              ? { x: r.left - gap, y: r.top + r.height / 2 }
              : { x: r.right + gap, y: r.top + r.height / 2 }
      setCoords({ ...pos, side: resolved })
      setOpen(true)
    }, delay)
  }

  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(false)
  }

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [])

  const transform: Record<Side, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  }

  return (
    <>
      <span
        ref={anchor}
        className="inline-flex"
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className={cn(
              'pointer-events-none fixed z-[120] max-w-[280px] animate-[scale-in_140ms_var(--ease-cockpit)_both]',
              'rounded-lg border border-line-3 bg-surface-2/95 px-2.5 py-1.5 text-[11.5px] leading-snug text-ink shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl',
              className,
            )}
            style={{ left: coords.x, top: coords.y, transform: transform[coords.side] }}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {content}
              {shortcut && <Kbd>{shortcut}</Kbd>}
            </span>
          </div>,
          document.body,
        )}
    </>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'mono inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-line-3 bg-white/[0.05] px-1.5 text-[10px] font-medium text-ink-mid',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
