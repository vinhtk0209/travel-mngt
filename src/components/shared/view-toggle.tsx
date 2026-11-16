import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ViewMode = 'list' | 'grid'

type ViewToggleProps = {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-white/80 p-1',
        className,
      )}
      role="group"
      aria-label="Display mode"
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'rounded-full p-2 transition',
          value === 'list' ? 'bg-coral-100 text-coral-600' : 'text-ink-muted hover:text-ink',
        )}
        aria-pressed={value === 'list'}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          'rounded-full p-2 transition',
          value === 'grid' ? 'bg-coral-100 text-coral-600' : 'text-ink-muted hover:text-ink',
        )}
        aria-pressed={value === 'grid'}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  )
}
