import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createTag, deleteTag, fetchTripTags, updateTag } from './api'

export function useTripTags(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripTags(tripId),
    queryFn: () => fetchTripTags(tripId!),
    enabled: Boolean(tripId),
    staleTime: 60_000,
  })
}

function useInvalidateTags(tripId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tripTags(tripId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.tripItems(tripId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.tripImages(tripId) })
  }
}

export function useCreateTag(tripId: string) {
  const invalidate = useInvalidateTags(tripId)
  return useMutation({
    mutationFn: (input: { name: string; color: string }) => createTag({ ...input, tripId }),
    onSuccess: invalidate,
  })
}

export function useUpdateTag(tripId: string) {
  const invalidate = useInvalidateTags(tripId)
  return useMutation({
    mutationFn: (input: { tagId: string; name: string; color: string }) =>
      updateTag(input.tagId, { name: input.name, color: input.color }),
    onSuccess: invalidate,
  })
}

export function useDeleteTag(tripId: string) {
  const invalidate = useInvalidateTags(tripId)
  return useMutation({
    mutationFn: (tagId: string) => deleteTag(tagId),
    onSuccess: invalidate,
  })
}
