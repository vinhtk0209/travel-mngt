import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { TripRole } from '@/lib/supabase/database.types'
import { useAuth } from '@/features/auth/auth-context'
import {
  fetchTripMembers,
  leaveTrip,
  removeMember,
  transferTripOwnership,
  updateMemberRole,
} from './api'

export function useTripMembers(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripMembers(tripId),
    queryFn: () => fetchTripMembers(tripId!),
    enabled: Boolean(tripId),
    staleTime: 30_000,
  })
}

export function useTripPermissions(tripId: string | undefined) {
  const { user } = useAuth()
  const membersQuery = useTripMembers(tripId)

  const membership = membersQuery.data?.find((member) => member.user_id === user?.id) ?? null
  const role: TripRole | null = membership?.role ?? null

  return {
    role,
    membership,
    isOwner: role === 'owner',
    canEdit: role === 'owner' || role === 'editor',
    isMember: Boolean(role),
    isLoading: membersQuery.isLoading,
  }
}

function useInvalidateMembers(tripId: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tripMembers(tripId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
    void queryClient.invalidateQueries({ queryKey: ['trips'] })
  }
}

export function useUpdateMemberRole(tripId: string | undefined) {
  const invalidate = useInvalidateMembers(tripId)
  return useMutation({
    mutationFn: (input: { memberId: string; role: TripRole }) =>
      updateMemberRole(input.memberId, input.role),
    onSuccess: invalidate,
  })
}

export function useRemoveMember(tripId: string | undefined) {
  const invalidate = useInvalidateMembers(tripId)
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: invalidate,
  })
}

export function useTransferOwnership(tripId: string | undefined) {
  const invalidate = useInvalidateMembers(tripId)
  return useMutation({
    mutationFn: (newOwnerId: string) => transferTripOwnership(tripId!, newOwnerId),
    onSuccess: invalidate,
  })
}

export function useLeaveTrip(tripId: string | undefined) {
  const { user } = useAuth()
  const invalidate = useInvalidateMembers(tripId)

  return useMutation({
    mutationFn: () => {
      if (!tripId || !user) throw new Error('You must be signed in')
      return leaveTrip(tripId, user.id)
    },
    onSuccess: invalidate,
  })
}
