import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/features/auth/api'
import type { TripRole } from '@/lib/supabase/database.types'
import type { TripMember, TripMemberWithProfile } from './types'
import { ROLE_ORDER } from './types'

export async function fetchTripMembers(tripId: string): Promise<TripMemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)

  if (error) throw error
  if (!members || members.length === 0) return []

  const userIds = members.map((member) => member.user_id)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (profileError) throw profileError

  const profileMap = new Map<string, Profile>()
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, profile)
  }

  return members
    .map((member) => ({
      ...member,
      profile: profileMap.get(member.user_id) ?? null,
    }))
    .sort((a, b) => {
      const roleDelta = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      if (roleDelta !== 0) return roleDelta
      const nameA = a.profile?.display_name ?? ''
      const nameB = b.profile?.display_name ?? ''
      return nameA.localeCompare(nameB)
    })
}

export async function updateMemberRole(memberId: string, role: TripRole): Promise<TripMember> {
  const { data, error } = await supabase
    .from('trip_members')
    .update({ role })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('trip_members').delete().eq('id', memberId)
  if (error) throw error
}

export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function transferTripOwnership(tripId: string, newOwnerId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_trip_ownership', {
    p_trip_id: tripId,
    p_new_owner_id: newOwnerId,
  })
  if (error) throw error
}
