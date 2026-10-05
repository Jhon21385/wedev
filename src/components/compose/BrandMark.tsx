import type { ToolkitId } from '@/integrations/types'

/* ============================================================================
   BRAND MARKS
   Single-colour glyphs, drawn rather than imported: lucide ships no brand
   icons, and a three-colour logo set would break the "no rainbow platform
   colours" rule. Each mark takes `currentColor`, so the platform tint is
   applied by whoever renders it — one accent per platform, never a logo dump.
   ========================================================================== */

export function BrandMark({ platform, className }: { platform: ToolkitId; className?: string }) {
  const common = { viewBox: '0 0 24 24', className, 'aria-hidden': true, fill: 'none' } as const

  if (platform === 'youtube') {
    return (
      <svg {...common}>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10.4 9.6l4.4 2.4-4.4 2.4V9.6z" fill="currentColor" />
      </svg>
    )
  }

  if (platform === 'instagram') {
    return (
      <svg {...common}>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.4 10.2v6.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="7.4" cy="7.5" r="1.1" fill="currentColor" />
      <path
        d="M11.2 16.8v-6.6m0 2.1c0-1.2 1-2.1 2.3-2.1s2.7.9 2.7 2.9v3.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
