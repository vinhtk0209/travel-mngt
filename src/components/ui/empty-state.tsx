import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  tone?: 'coral' | 'mint' | 'sky' | 'lavender'
}

const tones = {
  coral: 'bg-coral-100 text-coral-500',
  mint: 'bg-mint-100 text-mint-500',
  sky: 'bg-sky-100 text-sky-500',
  lavender: 'bg-lavender-100 text-lavender-500',
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = 'coral',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-coral-200 bg-white/55 px-6 py-12 text-center',
        className,
      )}
    >
      <span className={cn('mb-4 rounded-3xl p-4', tones[tone])}>
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
