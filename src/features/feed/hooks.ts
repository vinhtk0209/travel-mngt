import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import {
  createTripPost, createTripPostComment, deleteTripPost, deleteTripPostComment,
  fetchTripFeed, setTripPostPinned, toggleTripPostReaction,
  updateTripPost, updateTripPostComment,
  type FeedPost,
} from './api'

export function useTripFeed(tripId: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = supabase.channel(`trip-feed-${tripId}`)
    for (const table of ['trip_posts', 'trip_post_images', 'trip_post_reactions', 'trip_post_comments']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tripFeed(tripId) })
      })
    }
    channel.subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [tripId, queryClient])
  return useQuery({ queryKey: queryKeys.tripFeed(tripId), queryFn: () => fetchTripFeed(tripId), staleTime: 10_000 })
}

export function useFeedActions(tripId: string, userId: string | undefined) {
  const queryClient = useQueryClient()
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.tripFeed(tripId) })
  const requireUser = () => { if (!userId) throw new Error('Sign in required'); return userId }
  return {
    create: useMutation({ mutationFn: (input: { content: string; tripItemId: string | null; files: File[] }) =>
      createTripPost({ tripId, userId: requireUser(), ...input }), onSuccess: refresh }),
    update: useMutation({ mutationFn: (input: { postId: string; content: string; tripItemId: string | null }) =>
      updateTripPost(input.postId, input.content, input.tripItemId), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (post: FeedPost) => deleteTripPost(post), onSuccess: refresh }),
    pin: useMutation({ mutationFn: (input: { postId: string; pinned: boolean }) =>
      setTripPostPinned(input.postId, input.pinned), onSuccess: refresh }),
    react: useMutation({ mutationFn: (input: { postId: string; emoji: string; current?: string }) =>
      toggleTripPostReaction(input.postId, requireUser(), input.emoji, input.current), onSuccess: refresh }),
    comment: useMutation({ mutationFn: (input: { postId: string; content: string; parentCommentId: string | null }) =>
      createTripPostComment(input.postId, requireUser(), input.content, input.parentCommentId), onSuccess: refresh }),
    editComment: useMutation({ mutationFn: (input: { commentId: string; content: string }) =>
      updateTripPostComment(input.commentId, input.content), onSuccess: refresh }),
    removeComment: useMutation({ mutationFn: (commentId: string) => deleteTripPostComment(commentId), onSuccess: refresh }),
  }
}
