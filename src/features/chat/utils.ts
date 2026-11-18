import type { Tables } from '@/lib/supabase/database.types'

export type TripMessage = Tables<'trip_messages'>

const MAX_CACHED_MESSAGES = 200

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
