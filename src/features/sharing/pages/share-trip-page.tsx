import { AlertCircle, ArrowRight, CalendarDays, MapPin, Sparkles, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/auth-context'
import { formatDateRange } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import { useJoinTripByShare, useResolveTripShare } from '../hooks'

export function ShareTripPage() {
  const { t } = useI18n()
  const { token } = useParams<{ token: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const shareQuery = useResolveTripShare(token)
  const joinTrip = useJoinTripByShare(token)
  const navigate = useNavigate()
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    if (user) void shareQuery.refetch()
  }, [user?.id])

  const preview = shareQuery.data
  const loginPath = `/login?redirect=${encodeURIComponent(`/share/${token ?? ''}`)}`

  const handleJoin = () => {
    setJoinError(null)
    joinTrip.mutate(undefined, {
      onSuccess: (tripId) => navigate(`/trips/${tripId}`, { replace: true }),
      onError: (error) => {
        setJoinError(getErrorMessage(error, t('sharePage.joinError')))
      },
    })
  }

  if (shareQuery.isLoading || authLoading) {
    return (
      <AuthShell title={t('sharePage.openingTitle')} subtitle={t('sharePage.openingBody')}>
        <div className="flex justify-center py-10">
          <Spinner className="h-8 w-8" />
        </div>
      </AuthShell>
    )
  }

  if (shareQuery.isError) {
    return (
      <AuthShell
        title={t('sharePage.errorTitle')}
        subtitle={t('sharePage.errorBody')}
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="rounded-3xl bg-rose-100 p-4 text-rose-500">
            <AlertCircle className="h-8 w-8" />
          </span>
          <p className="text-sm text-ink-soft">{getErrorMessage(shareQuery.error)}</p>
          <Link to={user ? '/dashboard' : '/login'} className="w-full">
            <Button className="w-full" size="lg">
              {user ? t('common.backToMyTrips') : t('common.signIn')}
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  if (!preview) {
    return (
      <AuthShell
        title={t('sharePage.inactiveTitle')}
        subtitle={t('sharePage.inactiveBody')}
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="rounded-3xl bg-cream p-4 text-ink-muted">
            <Sparkles className="h-8 w-8" />
          </span>
          <Link to={user ? '/dashboard' : '/login'} className="w-full">
            <Button className="w-full" size="lg">
              {user ? t('common.backToMyTrips') : t('common.signIn')}
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={preview.name}
      subtitle={t('sharePage.sharedBy', { name: preview.owner_name })}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="coral" icon={<MapPin className="h-3 w-3" />}>
            {preview.destination || t('common.somewhereLovely')}
          </Badge>
          <Badge variant="mint" icon={<CalendarDays className="h-3 w-3" />}>
            {formatDateRange(preview.start_date, preview.end_date)}
          </Badge>
          <Badge variant="lavender" icon={<Users className="h-3 w-3" />}>
            {preview.member_count === 1
              ? t('sharePage.travelerOne', { count: preview.member_count })
              : t('sharePage.travelersMany', { count: preview.member_count })}
          </Badge>
        </div>

        {preview.description ? (
          <p className="text-sm leading-relaxed text-ink-soft">{preview.description}</p>
        ) : (
          <p className="text-sm leading-relaxed text-ink-soft">
            {t('sharePage.fallbackBody')}
          </p>
        )}

        <div className="rounded-2xl border border-border/70 bg-cream/60 px-3.5 py-2.5 text-xs font-semibold text-ink-muted">
          {t('common.joiningGives', { role: t(`role.${preview.share_role}`) })}
        </div>

        {joinError ? (
          <div
            role="alert"
            className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {joinError}
          </div>
        ) : null}

        {!user ? (
          <Link to={loginPath} className="block">
            <Button className="w-full" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              {t('sharePage.signInToJoin')}
            </Button>
          </Link>
        ) : preview.already_member ? (
          <Link to={`/trips/${preview.id}`} className="block">
            <Button className="w-full" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              {t('sharePage.open')}
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            isLoading={joinTrip.isPending}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {t('sharePage.join')}
          </Button>
        )}

        <p className="text-center text-[11px] text-ink-muted">
          {user ? t('sharePage.leaveLater') : t('sharePage.newHere')}
        </p>
      </div>
    </AuthShell>
  )
}
