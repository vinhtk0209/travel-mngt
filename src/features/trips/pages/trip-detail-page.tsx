import { ArrowLeft, CalendarDays, MapPin, Settings2, Sparkles, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '@/components/shared/app-shell'
import { CoverImage } from '@/components/shared/cover-image'
import { AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { TripAssistantDialog } from '@/features/assistant/components/trip-assistant-dialog'
import { useSignedImageUrls } from '@/features/images/hooks'
import { InviteMemberDialog } from '@/features/trip-members/components/invite-member-dialog'
import { useTripMembers, useTripPermissions } from '@/features/trip-members/hooks'
import { TripPlacesSection } from '@/features/trip-items/components/trip-places-section'
import { useTrip } from '../hooks'
import { formatDateRange, getTripTiming, getTripTimingLabel } from '@/utils/date'

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const tripQuery = useTrip(tripId)
  const membersQuery = useTripMembers(tripId)
  const permissions = useTripPermissions(tripId)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const trip = tripQuery.data
  const members = membersQuery.data ?? []
  const { urls: coverUrls } = useSignedImageUrls([trip?.cover_image])
  const coverUrl = trip?.cover_image ? coverUrls[trip.cover_image] : undefined

  const timing = trip ? getTripTiming(trip.start_date, trip.end_date) : 'undated'
  const avatars = members.map((member) => ({
    user_id: member.user_id,
    display_name: member.profile?.display_name ?? 'Traveler',
    avatar_url: member.profile?.avatar_url,
  }))

  return (
    <AppShell>
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition hover:text-coral-600"
      >
        <ArrowLeft className="h-4 w-4" /> All trips
      </Link>

      {tripQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-4xl sm:h-80" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : tripQuery.isError || !trip ? (
        <ErrorState
          title="This trip is out of reach"
          message="It may have been deleted, or you might no longer be a member of this trip."
          onRetry={() => void tripQuery.refetch()}
        />
      ) : (
        <div className="space-y-7">
          <CoverImage
            src={coverUrl}
            alt={trip.name}
            fallbackLabel={trip.destination || 'A new adventure'}
            className="h-64 w-full rounded-4xl border border-white/70 shadow-lift sm:h-80"
            overlay={
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:top-6">
                  <Badge
                    variant={timing === 'ongoing' ? 'mint' : timing === 'past' ? 'neutral' : 'coral'}
                    className="backdrop-blur"
                  >
                    {getTripTimingLabel(timing)}
                  </Badge>
                  {permissions.role ? (
                    <Badge variant="lavender" className="capitalize backdrop-blur">
                      {permissions.role === 'owner' ? 'You own this' : permissions.role}
                    </Badge>
                  ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <h1 className="font-display text-3xl font-extrabold leading-tight text-white text-balance sm:text-4xl">
                    {trip.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/85">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {trip.destination || 'Somewhere lovely'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </span>
                  </div>
                </div>
              </>
            }
          />

          <div className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-3">
                <AvatarGroup members={avatars} max={5} size="md" />
                <div>
                  <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink">
                    <Users className="h-4 w-4 text-coral-400" />
                    {members.length} {members.length === 1 ? 'traveler' : 'travelers'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {members
                      .slice(0, 3)
                      .map((member) => member.profile?.display_name ?? 'Traveler')
                      .join(', ')}
                    {members.length > 3 ? ` +${members.length - 3} more` : ''}
                  </p>
                </div>
              </div>
              {trip.description ? (
                <p className="max-w-2xl text-sm text-ink-soft">{trip.description}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setAssistantOpen(true)}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Ask Wanderbot
              </Button>
              {permissions.isOwner ? (
                <Button
                  variant="secondary"
                  onClick={() => setInviteOpen(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Invite / share
                </Button>
              ) : null}
              {permissions.canEdit ? (
                <Link
                  to={`/trips/${trip.id}/settings`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-white/80 px-5 text-sm font-bold text-ink transition hover:border-coral-200 hover:bg-coral-50"
                >
                  <Settings2 className="h-4 w-4" /> Trip settings
                </Link>
              ) : null}
            </div>
          </div>

          <TripPlacesSection tripId={trip.id} canEdit={permissions.canEdit} />
        </div>
      )}

      {trip ? (
        <TripAssistantDialog
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          tripId={trip.id}
          tripName={trip.name}
          tripDestination={trip.destination ?? undefined}
          defaultMode={trip.assistant_mode}
        />
      ) : null}

      {trip ? (
        <InviteMemberDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          tripId={trip.id}
          tripName={trip.name}
        />
      ) : null}
    </AppShell>
  )
}
