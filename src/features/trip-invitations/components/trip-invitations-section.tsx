import { Clock, Link2, Mail, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/utils/date'
import { useCancelInvitation, useTripInvitations } from '../hooks'
import type { TripInvitation } from '../api'

export function TripInvitationsSection({ tripId }: { tripId: string }) {
  const invitations = useTripInvitations(tripId)
  const cancelInvitation = useCancelInvitation(tripId)
  const [cancelling, setCancelling] = useState<TripInvitation | null>(null)

  const handleCancel = async () => {
    if (!cancelling) return
    await cancelInvitation.mutateAsync(cancelling.id)
    setCancelling(null)
  }

  if (invitations.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (!invitations.data || invitations.data.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        tone="sky"
        title="No pending invitations"
        description="Invite travel buddies by email or share a link. Pending invites will wait here until they respond."
        className="py-8"
      />
    )
  }

  return (
    <>
      <ul className="space-y-2">
        {invitations.data.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center gap-3 rounded-2xl border border-border/80 bg-white/60 p-3"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                invitation.email ? 'bg-sky-100 text-sky-500' : 'bg-lavender-100 text-lavender-500'
              }`}
            >
              {invitation.email ? <Mail className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">
                {invitation.email ?? 'Anyone with the link'}
              </p>
              <p className="flex items-center gap-1 text-xs text-ink-muted">
                <Clock className="h-3 w-3" /> Expires {formatDate(invitation.expires_at, 'd MMM')}
              </p>
            </div>
            <Badge variant={invitation.role === 'editor' ? 'mint' : 'sky'}>
              {invitation.role}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-rose-500 hover:bg-rose-50"
              onClick={() => setCancelling(invitation)}
              aria-label={`Cancel invitation for ${invitation.email ?? 'anyone with the link'}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={() => void handleCancel()}
        isLoading={cancelInvitation.isPending}
        title="Cancel invitation?"
        confirmLabel="Cancel invite"
        cancelLabel="Keep it"
        description={
          cancelling?.email ? (
            <>
              The invitation for <strong>{cancelling.email}</strong> will stop working immediately.
            </>
          ) : (
            'This share link will stop working immediately.'
          )
        }
      />
    </>
  )
}
