import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useI18n } from '@/i18n/i18n-context'

export type ViewMode = 'list' | 'grid'

type ViewToggleProps = {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-white/80 p-1',
        className,
      )}
      role="group"
      aria-label={t('view.mode')}
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'rounded-full p-2 transition',
          value === 'list' ? 'bg-coral-100 text-coral-600' : 'text-ink-muted hover:text-ink',
        )}
        aria-pressed={value === 'list'}
        aria-label={t('view.list')}
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
        aria-label={t('view.grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  )
}
