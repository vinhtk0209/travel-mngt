import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full resize-y rounded-2xl border border-border bg-white/85 px-4 py-3 text-sm text-ink shadow-sm transition placeholder:text-ink-muted/80 hover:border-coral-200 focus:border-coral-300 focus:outline-none focus:ring-4 focus:ring-coral-100/60 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    )
  },
)
