import type { TripRole } from '@/lib/supabase/database.types'

export type InviteRole = Exclude<TripRole, 'owner'>

export type MyInvitation = {
  invitation_id: string
  trip_id: string
  trip_name: string
  trip_destination: string
  inviter_name: string
  role: TripRole
  created_at: string
  expires_at: string
}

export type InviteResponse = {
  invitationId: string
  inviteLink: string
  emailSent: boolean
  emailError: string | null
}
