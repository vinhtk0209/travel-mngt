import { CloudOff } from 'lucide-react'
import { Button } from './button'

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'We hit a little detour',
  message = 'Something went wrong while loading this. Give it another try.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/60 px-6 py-12 text-center ' +
        (className ?? '')
      }
    >
      <span className="mb-4 rounded-3xl bg-white p-4 text-rose-400">
        <CloudOff className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
