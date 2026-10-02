import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

/* ============================================================================
   BUTTON
   Seven visual variants, three sizes, and every interactive state. The primary
   variant is the only place a filled accent appears in the product, which is
   what keeps the accent meaningful.
   ========================================================================== */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'accent-soft'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(180deg,#7AAFFF,#5B9DFF_58%,#4E8FEE)] text-[#05101F] font-semibold hover:bg-[linear-gradient(180deg,#93BEFF,#6EA9FF_58%,#5B9DFF)] border border-accent-bright/40 shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset,0_5px_20px_-8px_rgba(91,157,255,0.85)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_8px_28px_-8px_rgba(91,157,255,1)]',
  secondary:
    'bg-white/[0.055] text-ink-hi border border-line-3 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] hover:bg-white/[0.085] hover:border-line-4',
  'accent-soft': 'bg-accent/12 text-accent-ink border border-accent/25 hover:bg-accent/18 hover:border-accent/40',
  ghost: 'bg-transparent text-ink-mid border border-transparent hover:bg-white/[0.05] hover:text-ink-hi',
  outline: 'bg-transparent text-ink border border-line-3 hover:border-line-4 hover:bg-white/[0.035] hover:text-ink-hi',
  danger: 'bg-rose/12 text-rose border border-rose/30 hover:bg-rose/20 hover:border-rose/45',
  success: 'bg-emerald/12 text-emerald border border-emerald/30 hover:bg-emerald/20 hover:border-emerald/45',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-[11px] gap-1 rounded-md',
  sm: 'h-7.5 px-2.5 text-[12px] gap-1.5 rounded-md',
  md: 'h-8.5 px-3.5 text-[12.5px] gap-1.5 rounded-lg',
  lg: 'h-10 px-4 text-[13px] gap-2 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'sm', icon, iconRight, loading, block, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group/btn relative inline-flex select-none items-center justify-center overflow-hidden whitespace-nowrap font-medium',
        'transition-[background-color,border-color,background-image,color,box-shadow,transform] duration-[var(--duration-2)] ease-[var(--ease-cockpit)]',
        'press',
        'disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' && 'refract',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden />
      ) : (
        icon && (
          <span
            className={cn(
              'shrink-0 opacity-90 transition-transform duration-[var(--duration-2)] ease-[var(--ease-snap)] group-hover/btn:scale-110',
              size === 'lg' ? '[&>svg]:h-4 [&>svg]:w-4' : '[&>svg]:h-3.5 [&>svg]:w-3.5',
            )}
          >
            {icon}
          </span>
        )
      )}
      {children && <span className="truncate">{children}</span>}
      {iconRight && !loading && (
        <span className={cn('shrink-0 opacity-70 [&>svg]:h-3.5 [&>svg]:w-3.5')}>{iconRight}</span>
      )}
    </button>
  )
})

/* -------------------------------------------------------------------------- */
/* ICON BUTTON                                                                 */
/* -------------------------------------------------------------------------- */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  shortcut?: string
  /** Renders a small accent dot — used for "has unread" affordances. */
  dot?: boolean
  active?: boolean
  side?: 'top' | 'bottom' | 'left' | 'right'
}

const ICON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-6 w-6 rounded-md [&>svg]:h-3.5 [&>svg]:w-3.5',
  sm: 'h-7.5 w-7.5 rounded-md [&>svg]:h-4 [&>svg]:w-4',
  md: 'h-8.5 w-8.5 rounded-lg [&>svg]:h-4 [&>svg]:w-4',
  lg: 'h-10 w-10 rounded-lg [&>svg]:h-[18px] [&>svg]:w-[18px]',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'sm', shortcut, dot, active, side = 'bottom', className, ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center [&>svg]:transition-colors [&>svg]:duration-[var(--duration-2)]',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-2)] ease-[var(--ease-cockpit)]',
        'press',
        'disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-accent/14 text-accent-ink border border-accent/25 glow-1' : VARIANTS[variant],
        ICON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {dot && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(91,157,255,0.9)] animate-[blip_2.4s_ease-in-out_infinite]" />
      )}
    </button>
  )
  return (
    <Tooltip content={label} shortcut={shortcut} side={side}>
      {button}
    </Tooltip>
  )
})
