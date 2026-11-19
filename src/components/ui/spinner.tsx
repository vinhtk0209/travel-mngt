import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { translate } from '@/i18n/translate'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-coral-500', className)} aria-hidden />
}

export function FullPageSpinner({
  label = translate('spinner.loadingTrips'),
}: {
  label?: string
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Spinner className="h-8 w-8" />
      <p className="text-sm font-semibold text-ink-soft">{label}</p>
    </div>
  )
}
