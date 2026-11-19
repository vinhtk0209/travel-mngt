import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/utils/errors'
import { translate } from '@/i18n/translate'
import type { TripItemImage } from '@/features/images/api'
import {
  createPlace,
  deletePlace,
  fetchTripItems,
  reorderPlaces,
  setPlaceStatus,
  updatePlace,
  type PlaceInput,
  type TripItemWithMeta,
} from './api'

export function useTripItems(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripItems(tripId),
    queryFn: () => fetchTripItems(tripId!),
    enabled: Boolean(tripId),
    staleTime: 20_000,
  })
}

function useInvalidatePlaces(tripId: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tripItems(tripId) })
    void queryClient.invalidateQueries({ queryKey: ['trips'] })
  }
}

export function useCreatePlace(tripId: string) {
  const { user } = useAuth()
  const invalidate = useInvalidatePlaces(tripId)

  return useMutation({
    mutationFn: (input: { values: PlaceInput; files: File[] }) => {
      if (!user) throw new Error(translate('errors.authRequired'))
      return createPlace({ tripId, userId: user.id, ...input })
    },
    onSuccess: invalidate,
  })
}

export function useUpdatePlace(tripId: string) {
  const invalidate = useInvalidatePlaces(tripId)

  return useMutation({
    mutationFn: (input: {
      itemId: string
      values: PlaceInput
      files: File[]
      nextImageOrder: number
      removedImages: TripItemImage[]
    }) => updatePlace({ tripId, ...input }),
    onSuccess: invalidate,
  })
}

export function useDeletePlace(tripId: string) {
  const invalidate = useInvalidatePlaces(tripId)

  return useMutation({
    mutationFn: (itemId: string) => deletePlace(itemId),
    onSuccess: () => {
      invalidate()
      toast.success(translate('errors.place.removed'))
    },
    onError: (error) => toast.error(getErrorMessage(error, translate('errors.place.remove'))),
  })
}

export function useTogglePlace(tripId: string) {
  const invalidate = useInvalidatePlaces(tripId)

  return useMutation({
    mutationFn: (input: { itemId: string; status: 'todo' | 'completed' }) =>
      setPlaceStatus(input.itemId, input.status),
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error, translate('errors.place.update'))),
  })
}

export function useReorderPlaces(tripId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidatePlaces(tripId)

  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderPlaces(tripId, orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tripItems(tripId) })
      const previous = queryClient.getQueryData<TripItemWithMeta[]>(queryKeys.tripItems(tripId))

      if (previous) {
        const itemMap = new Map(previous.map((item) => [item.id, item]))
        const reordered = orderedIds
          .map((id) => itemMap.get(id))
          .filter((item): item is TripItemWithMeta => Boolean(item))
        const remaining = previous.filter((item) => !orderedIds.includes(item.id))
        queryClient.setQueryData(queryKeys.tripItems(tripId), [...reordered, ...remaining])
      }

      return { previous }
    },
    onError: (error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tripItems(tripId), context.previous)
      }
      toast.error(getErrorMessage(error, translate('errors.place.reorder')))
    },
    onSettled: invalidate,
  })
}
