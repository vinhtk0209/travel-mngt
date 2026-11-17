import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import type { InviteResponse, InviteRole, MyInvitation } from './types'

export type TripInvitation = Tables<'trip_invitations'>

function extractFunctionError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Could not create the invitation'
}

export async function inviteMember(input: {
  tripId: string
  email?: string
  role: InviteRole
}): Promise<InviteResponse> {
  const { data, error } = await supabase.functions.invoke<InviteResponse>('invite-member', {
    body: input,
  })

  if (error) {
    let message = extractFunctionError(error)
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string }
        if (payload.error) message = payload.error
      } catch {
        // Keep the original message if the response is not JSON.
      }
    }
    throw new Error(message)
  }

  if (!data || !data.invitationId) {
    throw new Error('The invitation service returned an unexpected response')
  }

  return data
}

export async function listMyInvitations(): Promise<MyInvitation[]> {
  const { data, error } = await supabase.rpc('list_my_invitations')
  if (error) throw error
  return data ?? []
}

export async function listTripInvitations(tripId: string): Promise<TripInvitation[]> {
  const { data, error } = await supabase
    .from('trip_invitations')
    .select('*')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function acceptInvitationById(invitationId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_trip_invitation_by_id', {
    p_invitation_id: invitationId,
  })
  if (error) throw error
  return data
}

export async function rejectInvitationById(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_trip_invitation_by_id', {
    p_invitation_id: invitationId,
  })
  if (error) throw error
}

export async function acceptInvitationByToken(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_trip_invitation', { p_token: token })
  if (error) throw error
  return data
}

export async function rejectInvitationByToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('reject_trip_invitation', { p_token: token })
  if (error) throw error
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.from('trip_invitations').delete().eq('id', invitationId)
  if (error) throw error
}
