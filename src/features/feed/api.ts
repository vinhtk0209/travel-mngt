import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import { removeStoredImages, uploadImage } from '@/features/images/api'

export type FeedPost = Tables<'trip_posts'> & {
  images: Tables<'trip_post_images'>[]
  reactions: Tables<'trip_post_reactions'>[]
  comments: Tables<'trip_post_comments'>[]
}

export async function fetchTripFeed(tripId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase.from('trip_posts').select('*')
    .eq('trip_id', tripId).order('pinned', { ascending: false })
    .order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  if (!posts?.length) return []
  const ids = posts.map((post) => post.id)
  const [images, reactions, comments] = await Promise.all([
    supabase.from('trip_post_images').select('*').in('post_id', ids).order('sort_order'),
    supabase.from('trip_post_reactions').select('*').in('post_id', ids),
    supabase.from('trip_post_comments').select('*').in('post_id', ids).order('created_at'),
  ])
  if (images.error) throw images.error
  if (reactions.error) throw reactions.error
  if (comments.error) throw comments.error
  return posts.map((post) => ({
    ...post,
    images: (images.data ?? []).filter((image) => image.post_id === post.id),
    reactions: (reactions.data ?? []).filter((reaction) => reaction.post_id === post.id),
    comments: (comments.data ?? []).filter((comment) => comment.post_id === post.id),
  }))
}

export async function createTripPost(input: {
  tripId: string; userId: string; content: string; tripItemId: string | null; files: File[]
}) {
  if (!input.content.trim() && input.files.length === 0) throw new Error('Add a message or photo')
  const { data: post, error } = await supabase.from('trip_posts').insert({
    trip_id: input.tripId, author_id: input.userId, content: input.content.trim(),
    trip_item_id: input.tripItemId,
  }).select('*').single()
  if (error) throw error
  const uploaded: string[] = []
  try {
    for (const [index, file] of input.files.entries()) {
      const image = await uploadImage({ tripId: input.tripId, folder: 'posts', file })
      uploaded.push(image.path)
      const { error: imageError } = await supabase.from('trip_post_images').insert({
        post_id: post.id, storage_path: image.path, file_name: image.fileName, sort_order: index,
      })
      if (imageError) throw imageError
    }
    return post
  } catch (cause) {
    await supabase.from('trip_posts').delete().eq('id', post.id)
    if (uploaded.length) await removeStoredImages(uploaded).catch(() => undefined)
    throw cause
  }
}

export async function updateTripPost(postId: string, content: string, tripItemId: string | null) {
  const { error } = await supabase.from('trip_posts').update({ content: content.trim(), trip_item_id: tripItemId }).eq('id', postId)
  if (error) throw error
}

export async function deleteTripPost(post: FeedPost) {
  const { error } = await supabase.from('trip_posts').delete().eq('id', post.id)
  if (error) throw error
  if (post.images.length) void removeStoredImages(post.images.map((image) => image.storage_path))
}

export async function setTripPostPinned(postId: string, pinned: boolean) {
  const { error } = await supabase.from('trip_posts').update({ pinned }).eq('id', postId)
  if (error) throw error
}

export async function toggleTripPostReaction(postId: string, userId: string, emoji: string, current?: string) {
  if (current === emoji) {
    const { error } = await supabase.from('trip_post_reactions').delete().eq('post_id', postId).eq('user_id', userId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('trip_post_reactions').upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: 'post_id,user_id' })
  if (error) throw error
}

export async function createTripPostComment(postId: string, userId: string, content: string, parentCommentId: string | null) {
  const { error } = await supabase.from('trip_post_comments').insert({
    post_id: postId, author_id: userId, content: content.trim(), parent_comment_id: parentCommentId,
  })
  if (error) throw error
}

export async function updateTripPostComment(commentId: string, content: string) {
  const { error } = await supabase.from('trip_post_comments').update({ content: content.trim() }).eq('id', commentId)
  if (error) throw error
}

export async function deleteTripPostComment(commentId: string) {
  const { error } = await supabase.from('trip_post_comments').delete().eq('id', commentId)
  if (error) throw error
}
