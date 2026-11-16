import { cn } from '@/utils/cn'

type ProgressProps = {
  value: number
  className?: string
  barClassName?: string
  label?: string
}

export function Progress({ value, className, barClassName, label }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-coral-100/80', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label ?? 'Trip progress'}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-coral-400 via-coral-500 to-mint-400 transition-all duration-500',
          barClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
