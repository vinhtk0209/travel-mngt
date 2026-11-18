import {
  ArrowLeft,
  Bot,
  CalendarDays,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  ShieldAlert,
  Sparkles,
  Tags,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/shared/app-shell'
import { CoverImage } from '@/components/shared/cover-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetTripAssistantMode } from '@/features/assistant/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { useSignedImageUrls } from '@/features/images/hooks'
import { TagManager } from '@/features/tags/components/tag-manager'
import { useTripTags } from '@/features/tags/hooks'
import { InviteMemberDialog } from '@/features/trip-members/components/invite-member-dialog'
import { MemberList } from '@/features/trip-members/components/member-list'
import { useLeaveTrip, useTripMembers, useTripPermissions } from '@/features/trip-members/hooks'
import { TripInvitationsSection } from '@/features/trip-invitations/components/trip-invitations-section'
import { useTripRealtime } from '@/hooks/use-trip-realtime'
import { getErrorMessage } from '@/utils/errors'
import { formatDateRange } from '@/utils/date'
import { cn } from '@/utils/cn'
import { TripFormModal } from '../components/trip-form-modal'
import { useDeleteTrip, useTrip } from '../hooks'

export function TripSettingsPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const tripQuery = useTrip(tripId)
  const membersQuery = useTripMembers(tripId)
  const permissions = useTripPermissions(tripId)
  const tagsQuery = useTripTags(tripId)
  const deleteTrip = useDeleteTrip()
  const setAssistantMode = useSetTripAssistantMode(tripId)
  const leaveTrip = useLeaveTrip(tripId)
  useTripRealtime(tripId)

  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  const trip = tripQuery.data
  const members = membersQuery.data ?? []
  const tags = tagsQuery.data ?? []
  const { urls: coverUrls } = useSignedImageUrls([trip?.cover_image])
  const coverUrl = trip?.cover_image ? coverUrls[trip.cover_image] : undefined

  const isLoading = tripQuery.isLoading || permissions.isLoading

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-10 w-52" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </AppShell>
    )
  }

  if (tripQuery.isError || !trip) {
    return (
      <AppShell>
        <ErrorState
          title="We could not open trip settings"
          message="The trip may have been deleted or you may no longer have access."
          onRetry={() => void tripQuery.refetch()}
        />
      </AppShell>
    )
  }

  if (!permissions.canEdit) {
    return <Navigate to={`/trips/${trip.id}`} replace />
  }

  const handleDelete = async () => {
    await deleteTrip.mutateAsync(trip.id)
    setDeleteOpen(false)
    navigate('/dashboard', { replace: true })
  }

  const handleLeave = async () => {
    await leaveTrip.mutateAsync()
    setLeaveOpen(false)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AppShell>
      <Link
        to={`/trips/${trip.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition hover:text-coral-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to trip
      </Link>

      <PageHeader
        eyebrow="Behind the scenes"
        title="Trip settings"
        description="Shape the trip details, invite your crew and keep everything tidy."
        actions={
          <Button
            variant="secondary"
            onClick={() => setEditOpen(true)}
            leftIcon={<Pencil className="h-4 w-4" />}
          >
            Edit details
          </Button>
        }
      />

      <div className="mt-7 space-y-6">
        <section className="surface-card overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <CoverImage
              src={coverUrl}
              alt={trip.name}
              fallbackLabel={trip.destination || 'Trip'}
              className="h-24 w-full shrink-0 rounded-2xl sm:w-40"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-extrabold">{trip.name}</h2>
                <Badge variant={permissions.isOwner ? 'butter' : 'mint'}>
                  {permissions.isOwner ? 'Owner' : 'Editor'}
                </Badge>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <MapPin className="h-3.5 w-3.5 text-coral-400" />
                {trip.destination || 'Somewhere lovely'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <CalendarDays className="h-3.5 w-3.5 text-coral-400" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </p>
              {trip.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{trip.description}</p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-coral-100 p-2 text-coral-500">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold">Travel buddies</h2>
                  <p className="text-xs text-ink-muted">{members.length} people on this trip</p>
                </div>
              </div>
              {permissions.isOwner ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setInviteOpen(true)}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Invite / share
                </Button>
              ) : null}
            </div>

            <MemberList
              tripId={trip.id}
              members={members}
              currentUserId={user?.id}
              isOwner={permissions.isOwner}
              isLoading={membersQuery.isLoading}
            />
          </section>

          <section className="surface-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-2xl bg-mint-100 p-2 text-mint-500">
                <Tags className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold">Tags</h2>
                <p className="text-xs text-ink-muted">Filter places by food, views, vibes…</p>
              </div>
            </div>
            <TagManager tripId={trip.id} tags={tags} canEdit={permissions.canEdit} />
          </section>
        </div>

        {permissions.isOwner ? (
          <section className="surface-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-lavender-100 p-2 text-lavender-500">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold">Wanderbot default</h2>
                  <p className="text-xs text-ink-muted">
                    New members start in this mode. Everyone can switch for themselves.
                  </p>
                </div>
              </div>
              {setAssistantMode.isPending ? (
                <span className="text-[11px] font-bold text-ink-muted">Saving…</span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AssistantModeCard
                active={trip.assistant_mode === 'basic'}
                icon={<Bot className="h-4 w-4" />}
                title="Basic"
                description="Curated packing, budget and itinerary tips. No API key, always available."
                onClick={() => setAssistantMode.mutate('basic')}
                disabled={setAssistantMode.isPending}
              />
              <AssistantModeCard
                active={trip.assistant_mode === 'gemini'}
                icon={<Sparkles className="h-4 w-4" />}
                title="Gemini AI"
                description="Free-form answers grounded in this trip. Needs a Gemini API key on the server."
                onClick={() => setAssistantMode.mutate('gemini')}
                disabled={setAssistantMode.isPending}
              />
            </div>

            {setAssistantMode.isError ? (
              <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">
                {getErrorMessage(setAssistantMode.error, 'Could not save the assistant mode')}
              </p>
            ) : null}
          </section>
        ) : null}

        {permissions.isOwner ? (
          <section className="surface-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-sky-100 p-2 text-sky-500">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold">Pending invitations</h2>
                  <p className="text-xs text-ink-muted">Email invites and share links waiting for a reply</p>
                </div>
              </div>
            </div>
            <TripInvitationsSection tripId={trip.id} />
          </section>
        ) : null}

        <section className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-2xl bg-white p-2 text-rose-500">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold text-rose-700">Careful zone</h2>
              <p className="text-xs text-rose-500/90">These actions cannot be undone.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-ink">
                {permissions.isOwner ? 'Delete this trip' : 'Leave this trip'}
              </p>
              <p className="text-xs text-ink-soft">
                {permissions.isOwner
                  ? 'Remove the trip, its places, photos and members for everyone.'
                  : 'You will lose access to this trip and its plans immediately.'}
              </p>
            </div>
            {permissions.isOwner ? (
              <Button
                variant="danger"
                onClick={() => setDeleteOpen(true)}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete trip
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setLeaveOpen(true)}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Leave trip
              </Button>
            )}
          </div>
        </section>
      </div>

      <TripFormModal open={editOpen} onClose={() => setEditOpen(false)} trip={trip} />
      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tripId={trip.id}
        tripName={trip.name}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        isLoading={deleteTrip.isPending}
        title="Delete this trip forever?"
        confirmLabel="Delete trip"
        description={
          <>
            <strong>{trip.name}</strong> and everything inside it will be permanently removed.
            Consider transferring ownership instead if someone else should keep planning.
          </>
        }
      />

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => void handleLeave()}
        isLoading={leaveTrip.isPending}
        title="Leave this trip?"
        confirmLabel="Leave trip"
        description={
          <>
            You will lose access to <strong>{trip.name}</strong>. The owner can invite you again
            later.
          </>
        }
      />
    </AppShell>
  )
}

function AssistantModeCard({
  active,
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  active: boolean
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'rounded-2xl border p-4 text-left transition disabled:opacity-60',
        active
          ? 'border-coral-300 bg-coral-50/70 shadow-card'
          : 'border-border bg-white/70 hover:border-coral-200 hover:bg-coral-50/40',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <span className={cn('rounded-xl p-1.5', active ? 'bg-coral-100 text-coral-600' : 'bg-cream text-ink-muted')}>
          {icon}
        </span>
        {title}
        {active ? <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-coral-600">Active</span> : null}
      </span>
      <span className="mt-2 block text-xs leading-relaxed text-ink-muted">{description}</span>
    </button>
  )
}