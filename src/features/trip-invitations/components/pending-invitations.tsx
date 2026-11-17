import { Check, MapPin, PartyPopper, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAcceptInvitation, useMyInvitations, useRejectInvitation } from '../hooks'
import type { MyInvitation } from '../types'

export function PendingInvitations() {
  const invitations = useMyInvitations()
  const accept = useAcceptInvitation()
  const reject = useRejectInvitation()
  const navigate = useNavigate()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const items = invitations.data ?? []
  if (items.length === 0) return null

  const handleAccept = async (invitation: MyInvitation) => {
    setPendingId(invitation.invitation_id)
    try {
      const tripId = await accept.mutateAsync(invitation.invitation_id)
      navigate(`/trips/${tripId}`)
    } finally {
      setPendingId(null)
    }
  }

  const handleReject = async (invitation: MyInvitation) => {
    setPendingId(invitation.invitation_id)
    try {
      await reject.mutateAsync(invitation.invitation_id)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="surface-card overflow-hidden border-lavender-200/70 bg-gradient-to-r from-lavender-50 via-white to-cream p-5 dark:border-lavender-500/30 dark:from-lavender-500/10 dark:via-transparent dark:to-transparent sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-lavender-100 p-3 text-lavender-500">
          <PartyPopper className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-extrabold">You have an invitation</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Someone wants to plan a trip with you. How lovely is that?
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((invitation) => {
          const isBusy = pendingId === invitation.invitation_id
          return (
            <li
              key={invitation.invitation_id}
              className="flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-extrabold">{invitation.trip_name}</p>
                  <Badge variant={invitation.role === 'editor' ? 'mint' : 'sky'}>
                    {invitation.role}
                  </Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {invitation.trip_destination || 'Somewhere new'}
                  </span>
                  <span>Invited by {invitation.inviter_name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleReject(invitation)}
                  disabled={isBusy}
                  leftIcon={<X className="h-3.5 w-3.5" />}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleAccept(invitation)}
                  isLoading={isBusy}
                  leftIcon={<Check className="h-3.5 w-3.5" />}
                >
                  Join trip
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
