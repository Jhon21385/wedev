import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getDataset } from '@/data/store'
import type { Dataset } from '@/data/types'

/** The dataset is static for the session: read it directly, no suspense needed. */
export function useDataset(): Dataset {
  return getDataset()
}

/** Deterministic skeleton on first paint, then settle. Prevents layout flash
    without ever showing a blank screen. */
export function useSettled(delay = 260) {
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && document.documentElement.dataset.motion === 'reduced'
    const t = setTimeout(() => setSettled(true), reduce ? 0 : delay)
    return () => clearTimeout(t)
  }, [delay])
  return settled
}

/** Window scroll listener guarded for SSR-safety and passive by default. */
export function useScrollY(threshold = 8) {
  const [passed, setPassed] = useState(false)
  useEffect(() => {
    const onScroll = () => setPassed(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return passed
}

/** Cursor-aware spotlight: writes --mx / --my onto the element. */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }, [])
  return { ref, onPointerMove }
}

/** Element size observer used by charts that must fit their container. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setSize({ width: box.width, height: box.height })
    })
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

/** Click-outside + Escape handling for popovers and menus. */
export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return ref
}

/** Global keyboard shortcut registry. Ignores keystrokes inside text fields
    unless `allowInInput` is set. */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, opts: { allowInInput?: boolean } = {}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      const combo = [
        e.metaKey || e.ctrlKey ? 'mod' : null,
        e.shiftKey ? 'shift' : null,
        e.altKey ? 'alt' : null,
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')
      const handler = map[combo]
      if (!handler) return
      if (inField && !opts.allowInInput && !combo.startsWith('mod')) return
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [map, opts.allowInInput])
}

/** Timers that clean themselves up. */
export function useInterval(fn: () => void, ms: number | null) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  }, [fn])
  useEffect(() => {
    if (ms === null) return
    const id = setInterval(() => saved.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}

/** Copy-to-clipboard with a transient "copied" flag. */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), timeout)
      } catch {
        /* clipboard unavailable — silently ignore */
      }
    },
    [timeout],
  )
  return { copied, copy }
}

/** Local, non-persistent "is this thing hovered" for chart cross-highlighting. */
export function useHoverKey<T extends string | number>() {
  const [key, setKey] = useState<T | null>(null)
  return { key, setKey, bind: (k: T) => ({ onMouseEnter: () => setKey(k), onMouseLeave: () => setKey(null) }) }
}
