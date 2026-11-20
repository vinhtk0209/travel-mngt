import { Plane } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/i18n-context'
import { cn } from '@/utils/cn'

type LogoProps = {
  compact?: boolean
  responsive?: boolean
  className?: string
  to?: string
}

export function Logo({ compact = false, responsive = false, className, to = '/dashboard' }: LogoProps) {
  const { t } = useI18n()

  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5', className)}
      aria-label={t('nav.home')}
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-coral-500 text-white shadow-[0_10px_20px_-10px_rgba(255,112,89,0.9)]">
        <Plane className="h-5 w-5 -rotate-12" strokeWidth={2.4} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-cream bg-mint-400" />
      </span>
      {!compact ? (
        <span className={cn('font-display text-xl font-extrabold tracking-tight text-ink', responsive && 'hidden min-[420px]:inline')}>
          Wanderlist
        </span>
      ) : null}
    </Link>
  )
}
