import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { Tables } from '@/lib/supabase/database.types'
import { fetchTripMessages, sendTripMessage } from './api'
import { mergeMessages, type TripMessage } from './utils'
import { translate } from '@/i18n/translate'

export function useTripMessages(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripMessages(tripId),
    queryFn: () => fetchTripMessages(tripId!),
    enabled: Boolean(tripId),
    staleTime: 15_000,
  })
}

export function useSendTripMessage(tripId: string | undefined, senderId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) => {
      if (!tripId || !senderId) throw new Error(translate('errors.authRequired'))
      return sendTripMessage({ tripId, senderId, content })
    },
    onSuccess: (message) => {
      queryClient.setQueryData<TripMessage[]>(queryKeys.tripMessages(tripId), (current) =>
        mergeMessages(current ?? [], [message]),
      )
    },
  })
}

/**
 * Realtime is only a cache signal: each INSERT is merged by id so mutation
 * responses and socket echoes cannot duplicate a bubble.
 */
export function useTripChatRealtime(tripId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const message = payload.new as Tables<'trip_messages'>
          queryClient.setQueryData<TripMessage[]>(queryKeys.tripMessages(tripId), (current) =>
            mergeMessages(current ?? [], [message]),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tripId, queryClient])
}
