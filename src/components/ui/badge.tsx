import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type BadgeVariant = 'neutral' | 'coral' | 'mint' | 'sky' | 'lavender' | 'butter' | 'success' | 'danger'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-white/80 text-ink-soft border-border',
  coral: 'bg-coral-100 text-coral-700 border-coral-200',
  mint: 'bg-mint-100 text-mint-600 border-mint-200',
  sky: 'bg-sky-100 text-sky-500 border-sky-200',
  lavender: 'bg-lavender-100 text-lavender-500 border-lavender-200',
  butter: 'bg-butter-100 text-amber-700 border-butter-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-600 border-rose-200',
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  icon?: ReactNode
}

export function Badge({ className, variant = 'neutral', icon, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}
