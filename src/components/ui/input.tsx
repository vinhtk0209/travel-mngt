import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-2xl border border-border bg-white/85 px-4 text-sm text-ink shadow-sm transition placeholder:text-ink-muted/80 hover:border-coral-200 focus:border-coral-300 focus:outline-none focus:ring-4 focus:ring-coral-100/60 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    )
  },
)
