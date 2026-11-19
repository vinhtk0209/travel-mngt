import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  disableTripShare,
  getOrCreateTripShare,
  joinTripByShare,
  regenerateTripShareToken,
  resolveTripShare,
  setTripShareRole,
} from './api'
import type { ShareRole } from './types'
import { translate } from '@/i18n/translate'

function useInvalidateShare(tripId: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
    void queryClient.invalidateQueries({ queryKey: ['trips'] })
    void queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] })
  }
}

export function useCreateTripShare(tripId: string | undefined) {
  const invalidate = useInvalidateShare(tripId)
  return useMutation({
    mutationFn: (role: ShareRole) => {
      if (!tripId) throw new Error(translate('sharing.errors.tripMissing'))
      return getOrCreateTripShare(tripId, role)
    },
    onSuccess: invalidate,
  })
}

export function useSetTripShareRole(tripId: string | undefined) {
  const invalidate = useInvalidateShare(tripId)
  return useMutation({
    mutationFn: (role: ShareRole) => {
      if (!tripId) throw new Error(translate('sharing.errors.tripMissing'))
      return setTripShareRole(tripId, role)
    },
    onSuccess: invalidate,
  })
}

export function useRegenerateTripShare(tripId: string | undefined) {
  const invalidate = useInvalidateShare(tripId)
  return useMutation({
    mutationFn: () => {
      if (!tripId) throw new Error(translate('sharing.errors.tripMissing'))
      return regenerateTripShareToken(tripId)
    },
    onSuccess: invalidate,
  })
}

export function useDisableTripShare(tripId: string | undefined) {
  const invalidate = useInvalidateShare(tripId)
  return useMutation({
    mutationFn: () => {
      if (!tripId) throw new Error(translate('sharing.errors.tripMissing'))
      return disableTripShare(tripId)
    },
    onSuccess: invalidate,
  })
}

export function useResolveTripShare(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sharedTrip(token),
    queryFn: () => resolveTripShare(token!),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  })
}

export function useJoinTripByShare(token: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!token) throw new Error(translate('sharing.errors.tokenMissing'))
      return joinTripByShare(token)
    },
    onSuccess: (tripId) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sharedTrip(token) })
    },
  })
}
