import type { Tables } from '@/lib/supabase/database.types'

export type TripMessage = Tables<'trip_messages'>
export type TripMessageAttachment = Tables<'trip_message_attachments'>
export type TripMessageReaction = Tables<'trip_message_reactions'>

export type ReactionSummary = {
  emoji: string
  count: number
  reactedByMe: boolean
}

export const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'] as const

const MAX_CACHED_MESSAGES = 200

export function summarizeReactions(
  reactions: TripMessageReaction[],
  currentUserId: string | undefined,
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>()

  for (const reaction of reactions) {
    const current = byEmoji.get(reaction.emoji)
    if (current) {
      current.count += 1
      current.reactedByMe ||= reaction.user_id === currentUserId
    } else {
      byEmoji.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        reactedByMe: reaction.user_id === currentUserId,
      })
    }
  }

  return [...byEmoji.values()].sort(
    (a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji),
  )
}

export function findUserReaction(
  reactions: TripMessageReaction[],
  userId: string | undefined,
): string | undefined {
  if (!userId) return undefined
  return reactions.find((reaction) => reaction.user_id === userId)?.emoji
}

/**
 * Merge realtime payloads and refetches without duplicating a message that
 * arrives through both the INSERT echo and the mutation response.
 */
export function mergeMessages(
  current: TripMessage[],
  incoming: TripMessage[],
): TripMessage[] {
  const byId = new Map<string, TripMessage>()
  for (const message of current) byId.set(message.id, message)
  for (const message of incoming) byId.set(message.id, message)

  return [...byId.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .slice(-MAX_CACHED_MESSAGES)
}
