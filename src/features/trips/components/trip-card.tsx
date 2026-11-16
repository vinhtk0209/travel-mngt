import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CoverImage } from '@/components/shared/cover-image'
import { Progress } from '@/components/ui/progress'
import { formatDateRange, getTripTiming, getTripTimingLabel } from '@/utils/date'
import type { DashboardTrip } from '../types'

type TripCardProps = {
  data: DashboardTrip
  coverUrl?: string
}

export function TripCard({ data, coverUrl }: TripCardProps) {
  const { trip, members, totalPlaces, completedPlaces, isOwner } = data
  const percent = totalPlaces > 0 ? (completedPlaces / totalPlaces) * 100 : 0
  const timing = getTripTiming(trip.start_date, trip.end_date)

  const avatars = members.map((member) => ({
    user_id: member.user_id,
    display_name: member.profile?.display_name ?? 'Traveler',
    avatar_url: member.profile?.avatar_url,
  }))

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-surface/90 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
    >
      <CoverImage
        src={coverUrl}
        alt={trip.name}
        fallbackLabel={trip.destination || 'A new adventure'}
        className="h-44 w-full"
        overlay={
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <Badge
                variant={timing === 'ongoing' ? 'mint' : timing === 'past' ? 'neutral' : 'coral'}
                className="backdrop-blur"
              >
                {getTripTimingLabel(timing)}
              </Badge>
              {isOwner ? null : (
                <Badge variant="lavender" className="backdrop-blur">
                  Shared
                </Badge>
              )}
            </div>
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-white/90">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            </div>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-1 font-display text-xl font-extrabold tracking-tight transition group-hover:text-coral-600">
            {trip.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-coral-400" />
            <span className="line-clamp-1">{trip.destination || 'Somewhere lovely'}</span>
          </p>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-ink-muted">
              {completedPlaces}/{totalPlaces} places done
            </span>
            <span className={percent === 100 && totalPlaces > 0 ? 'text-mint-600' : 'text-coral-600'}>
              {Math.round(percent)}%
            </span>
          </div>
          <Progress value={percent} label={`${trip.name} progress`} />
          <div className="flex items-center justify-between pt-1">
            <AvatarGroup members={avatars} max={4} />
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
              <Users className="h-3.5 w-3.5" />
              {members.length}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
