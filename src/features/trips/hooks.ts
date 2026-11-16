import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-context'
import {
  createTrip,
  deleteTrip,
  fetchDashboardTrips,
  fetchTrip,
  fetchTrips,
  updateTrip,
} from './api'
import type { TripFormValues } from './schemas'

export function useTrips() {
  return useQuery({
    queryKey: queryKeys.trips,
    queryFn: fetchTrips,
    staleTime: 30_000,
  })
}

export function useDashboardTrips() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...queryKeys.trips, 'dashboard', user?.id],
    queryFn: () => fetchDashboardTrips(user!.id),
    enabled: Boolean(user),
    staleTime: 20_000,
  })
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => fetchTrip(tripId!),
    enabled: Boolean(tripId),
    staleTime: 20_000,
  })
}

function useInvalidateTrips(tripId?: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['trips'] })
    if (tripId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
    }
  }
}

export function useCreateTrip() {
  const { user } = useAuth()
  const invalidate = useInvalidateTrips()

  return useMutation({
    mutationFn: (input: { values: TripFormValues; coverFile?: File | null }) => {
      if (!user) throw new Error('You must be signed in to create a trip')
      return createTrip({ ...input, ownerId: user.id })
    },
    onSuccess: invalidate,
  })
}

export function useUpdateTrip(tripId: string | undefined) {
  const invalidate = useInvalidateTrips(tripId)

  return useMutation({
    mutationFn: (input: {
      values: TripFormValues
      coverFile?: File | null
      previousCoverPath?: string | null
      removeCover?: boolean
    }) => {
      if (!tripId) throw new Error('Trip is missing')
      return updateTrip({ ...input, tripId })
    },
    onSuccess: invalidate,
  })
}

export function useDeleteTrip() {
  const invalidate = useInvalidateTrips()

  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: invalidate,
  })
}
