import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { Tables } from '@/lib/supabase/database.types'
import {
  fetchTripMessageAttachments,
  fetchTripChatReads,
  fetchTripMessageReactions,
  fetchTripMessageMentions,
  fetchTripMessages,
  sendTripMessage,
  editTripMessage,
  markTripChatRead,
  setTripChatNotifications,
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

export function useTripChatReads(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripChatReads(tripId),
    queryFn: () => fetchTripChatReads(tripId!),
    enabled: Boolean(tripId),
    staleTime: 10_000,
  })
}

export function useMarkTripChatRead(tripId: string, userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (at: string) => {
      if (!userId) throw new Error(translate('errors.authRequired'))
      return markTripChatRead(tripId, at)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.tripChatReads(tripId) }),
  })
}

export function useSetTripChatNotifications(tripId: string, userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => {
      if (!userId) throw new Error(translate('errors.authRequired'))
      return setTripChatNotifications(tripId, enabled)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.tripChatReads(tripId) }),
  })
}

export function useEditTripMessage(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, content, mentionIds }: { messageId: string; content: string; mentionIds: string[] }) =>
      editTripMessage(messageId, content, mentionIds),
    onSuccess: (message) => {
      queryClient.setQueryData<TripMessage[]>(queryKeys.tripMessages(tripId),
        (current) => mergeMessages(current ?? [], [message]))
      void queryClient.invalidateQueries({ queryKey: queryKeys.tripMessageMentions(tripId) })
    },
  })
}

export function useTripMessageMentions(tripId: string | undefined, messageIds: string[]) {
  return useQuery({
    queryKey: queryKeys.tripMessageMentions(tripId),
    queryFn: () => fetchTripMessageMentions(messageIds),
    enabled: Boolean(tripId) && messageIds.length > 0,
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
    mutationFn: (input: { content: string; file?: File | null; mentionIds?: string[] }) => {
      if (!tripId || !senderId) throw new Error(translate('errors.authRequired'))
      return sendTripMessage({ tripId, content: input.content, file: input.file, mentionIds: input.mentionIds })
    },
    onSuccess: ({ message, attachment }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tripMessageMentions(tripId) })
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
          event: '*',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            void queryClient.invalidateQueries({ queryKey: queryKeys.tripMessages(tripId) })
            return
          }
          const message = payload.new as Tables<'trip_messages'>
          queryClient.setQueryData<TripMessage[]>(queryKeys.tripMessages(tripId), (current) =>
            mergeMessages(current ?? [], [message]),
          )
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_chat_reads', filter: `trip_id=eq.${tripId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tripChatReads(tripId) })
      })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_message_mentions' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tripMessageMentions(tripId) })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tripId, queryClient])
}
