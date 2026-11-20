import { describe, expect, it } from 'vitest'
import {
  findUserReaction,
  mergeMessages,
  summarizeReactions,
  type TripMessage,
  type TripMessageReaction,
} from './utils'

function message(id: string, createdAt: string, content = `message ${id}`): TripMessage {
  return {
    id,
    trip_id: 'trip-1',
    sender_id: 'user-1',
    content,
    created_at: createdAt,
  }
}

function reaction(
  messageId: string,
  userId: string,
  emoji: string,
): TripMessageReaction {
  return {
    message_id: messageId,
    user_id: userId,
    emoji,
    created_at: '2026-01-01T10:00:00.000Z',
  }
}

describe('reactions', () => {
  it('groups reactions and marks the current user', () => {
    const summary = summarizeReactions(
      [
        reaction('m1', 'me', '❤️'),
        reaction('m1', 'friend', '❤️'),
        reaction('m1', 'friend-2', '😂'),
      ],
      'me',
    )

    expect(summary).toEqual([
      { emoji: '❤️', count: 2, reactedByMe: true },
      { emoji: '😂', count: 1, reactedByMe: false },
    ])
  })

  it('finds the current user reaction', () => {
    expect(findUserReaction([reaction('m1', 'me', '🎉')], 'me')).toBe('🎉')
    expect(findUserReaction([reaction('m1', 'friend', '🎉')], 'me')).toBeUndefined()
  })
})

describe('mergeMessages', () => {
  it('deduplicates messages that arrive twice', () => {
    const first = message('a', '2026-01-01T10:00:00.000Z')
    const merged = mergeMessages([first], [first])
    expect(merged).toHaveLength(1)
  })

  it('keeps newest content for an existing id', () => {
    const original = message('a', '2026-01-01T10:00:00.000Z', 'old')
    const edited = message('a', '2026-01-01T10:00:00.000Z', 'new')
    expect(mergeMessages([original], [edited])[0]?.content).toBe('new')
  })

  it('orders by created_at regardless of arrival order', () => {
    const late = message('b', '2026-01-01T10:05:00.000Z')
    const early = message('a', '2026-01-01T10:00:00.000Z')
    expect(mergeMessages([late], [early]).map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('caps the cache at the newest 200 messages', () => {
    const existing = Array.from({ length: 200 }, (_, index) =>
      message(`m${index}`, new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()),
    )
    const newest = message('newest', '2026-01-02T00:00:00.000Z')
    const merged = mergeMessages(existing, [newest])
    expect(merged).toHaveLength(200)
    expect(merged[merged.length - 1]?.id).toBe('newest')
    expect(merged.some((entry) => entry.id === 'm0')).toBe(false)
  })
})
