import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { Tables } from '@/lib/supabase/database.types'
import {
  fetchTripMessageAttachments,
  fetchTripMessageReactions,
  fetchTripMessages,
  sendTripMessage,
  toggleTripMessageReaction,
  updateTripChatBackground,
} from './api'
import {
  mergeMessages,
  type TripMessage,
  type TripMessageAttachment,
  type TripMessageReaction,
} from './utils'
import { translate } from '@/i18n/translate'

export function useTripMessages(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripMessages(tripId),
    queryFn: () => fetchTripMessages(tripId!),
    enabled: Boolean(tripId),
    staleTime: 15_000,
  })
}

export function useTripMessageAttachments(
  tripId: string | undefined,
  messageIds: string[],
) {
  return useQuery({
    queryKey: queryKeys.tripMessageAttachments(tripId),
    queryFn: () => fetchTripMessageAttachments(messageIds),
    enabled: Boolean(tripId) && messageIds.length > 0,
    staleTime: 30_000,
  })
}

export function useTripMessageReactions(tripId: string | undefined, messageIds: string[]) {
  return useQuery({
    queryKey: queryKeys.tripMessageReactions(tripId),
    queryFn: () => fetchTripMessageReactions(messageIds),
    enabled: Boolean(tripId) && messageIds.length > 0,
    staleTime: 15_000,
  })
}

export function useSendTripMessage(tripId: string | undefined, senderId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { content: string; file?: File | null }) => {
      if (!tripId || !senderId) throw new Error(translate('errors.authRequired'))
      return sendTripMessage({ tripId, senderId, content: input.content, file: input.file })
    },
    onSuccess: ({ message, attachment }) => {
      queryClient.setQueryData<TripMessage[]>(queryKeys.tripMessages(tripId), (current) =>
        mergeMessages(current ?? [], [message]),
      )

      if (attachment) {
        queryClient.setQueryData<TripMessageAttachment[]>(
          queryKeys.tripMessageAttachments(tripId),
          (current) => [...(current ?? []), attachment],
        )
      }
    },
  })
}

export function useToggleTripMessageReaction(
  tripId: string | undefined,
  userId: string | undefined,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { messageId: string; emoji: string; currentEmoji?: string }) => {
      if (!userId) throw new Error(translate('errors.authRequired'))
      return toggleTripMessageReaction({ ...input, userId })
    },
    onSuccess: (reaction, input) => {
      queryClient.setQueryData<TripMessageReaction[]>(
        queryKeys.tripMessageReactions(tripId),
        (current) => {
          const withoutMine = (current ?? []).filter(
            (item) => !(item.message_id === input.messageId && item.user_id === userId),
          )
          return reaction ? [...withoutMine, reaction] : withoutMine
        },
      )
    },
  })
}

export function useUpdateTripChatBackground(tripId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      preset: Tables<'trips'>['chat_background']
      file?: File | null
      currentPath?: string | null
    }) => {
      if (!tripId) throw new Error(translate('errors.authRequired'))
      return updateTripChatBackground({ ...input, tripId })
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Tables<'trips'>>(queryKeys.trip(tripId), (current) =>
        current
          ? {
              ...current,
              chat_background: result.preset,
              chat_background_path: result.path,
            }
          : current,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips })
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_message_attachments' },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tripMessageAttachments(tripId),
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_message_reactions' },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tripMessageReactions(tripId),
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tripId, queryClient])
}
