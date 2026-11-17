import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import { getErrorMessage } from '@/utils/errors'
import {
  acceptInvitationById,
  acceptInvitationByToken,
  cancelInvitation,
  inviteMember,
  listMyInvitations,
  listTripInvitations,
  rejectInvitationById,
  rejectInvitationByToken,
} from './api'
import type { InviteRole } from './types'

export function useMyInvitations() {
  return useQuery({
    queryKey: queryKeys.myInvitations,
    queryFn: listMyInvitations,
    staleTime: 30_000,
  })
}

export function useTripInvitations(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripInvitations(tripId),
    queryFn: () => listTripInvitations(tripId!),
    enabled: Boolean(tripId),
    staleTime: 30_000,
  })
}

function useInvalidateAfterResponse(tripId?: string) {
  const queryClient = useQueryClient()
  return (overrideTripId?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.myInvitations })
    void queryClient.invalidateQueries({ queryKey: ['trips'] })
    const id = overrideTripId ?? tripId
    if (id) {
      void queryClient.invalidateQueries({ queryKey: ['trip', id] })
    }
  }
}

export function useInviteMember(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email?: string; role: InviteRole }) =>
      inviteMember({ tripId, email: input.email, role: input.role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tripInvitations(tripId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tripMembers(tripId) })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not create invitation'))
    },
  })
}

export function useCancelInvitation(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tripInvitations(tripId) })
      toast.success('Invitation cancelled')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel invitation')),
  })
}

export function useAcceptInvitation() {
  const invalidate = useInvalidateAfterResponse()
  return useMutation({
    mutationFn: (invitationId: string) => acceptInvitationById(invitationId),
    onSuccess: () => {
      invalidate()
      toast.success('You joined the trip!')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not accept invitation')),
  })
}

export function useRejectInvitation() {
  const invalidate = useInvalidateAfterResponse()
  return useMutation({
    mutationFn: (invitationId: string) => rejectInvitationById(invitationId),
    onSuccess: () => {
      invalidate()
      toast.success('Invitation declined')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not decline invitation')),
  })
}

export function useAcceptInvitationByToken() {
  const invalidate = useInvalidateAfterResponse()
  return useMutation({
    mutationFn: (token: string) => acceptInvitationByToken(token),
    onSuccess: (tripId) => {
      invalidate(tripId)
      toast.success('You joined the trip!')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not accept invitation')),
  })
}

export function useRejectInvitationByToken() {
  const invalidate = useInvalidateAfterResponse()
  return useMutation({
    mutationFn: (token: string) => rejectInvitationByToken(token),
    onSuccess: () => {
      invalidate()
      toast.success('Invitation declined')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not decline invitation')),
  })
}
