import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { addTripMember, createTestUser, createTripForUser, type TestUser } from './support/admin'
import { readLocalEnv } from './support/local'

async function clientFor(user: TestUser) {
  const { url, anonKey } = readLocalEnv()
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return client
}

test('chat, mentions, notifications and feed enforce trip membership and ownership', async () => {
  const owner = await createTestUser('permissions-owner')
  const viewer = await createTestUser('permissions-viewer')
  const outsider = await createTestUser('permissions-outsider')
  const tripId = await createTripForUser(owner)
  await addTripMember(tripId, viewer, 'viewer')
  const [ownerDb, viewerDb, outsiderDb] = await Promise.all([
    clientFor(owner), clientFor(viewer), clientFor(outsider),
  ])

  const { data: message, error: messageError } = await ownerDb.from('trip_messages')
    .insert({ trip_id: tripId, sender_id: owner.id, content: 'Private chat' }).select('id').single()
  expect(messageError).toBeNull()
  expect(message).toBeTruthy()
  const messageId = message!.id as string
  const { data: hiddenChat } = await outsiderDb.from('trip_messages').select('id').eq('id', messageId)
  expect(hiddenChat).toEqual([])
  const { error: outsiderChatError } = await outsiderDb.from('trip_messages')
    .insert({ trip_id: tripId, sender_id: outsider.id, content: 'Intrusion' })
  expect(outsiderChatError).not.toBeNull()
  const { data: viewerEdit } = await viewerDb.from('trip_messages')
    .update({ content: 'Changed by viewer' }).eq('id', messageId).select('id')
  expect(viewerEdit).toEqual([])

  const { error: mentionError } = await ownerDb.from('trip_message_mentions')
    .insert({ message_id: messageId, user_id: viewer.id })
  expect(mentionError).toBeNull()
  const { error: outsiderMentionError } = await ownerDb.from('trip_message_mentions')
    .insert({ message_id: messageId, user_id: outsider.id })
  expect(outsiderMentionError).not.toBeNull()
  const rejectedText = `Rejected mention ${Date.now()}`
  const { error: rejectedSendError } = await ownerDb.rpc('send_trip_message', {
    p_trip_id: tripId, p_content: rejectedText, p_mentioned_user_ids: [outsider.id],
  })
  expect(rejectedSendError).not.toBeNull()
  const { data: rejectedMessages } = await ownerDb.from('trip_messages').select('id').eq('content', rejectedText)
  expect(rejectedMessages).toEqual([])
  const { data: sent, error: sendError } = await viewerDb.rpc('send_trip_message', {
    p_trip_id: tripId, p_content: 'Atomic mention', p_mentioned_user_ids: [owner.id, owner.id],
  })
  expect(sendError).toBeNull()
  const { data: sentMentions } = await viewerDb.from('trip_message_mentions')
    .select('user_id').eq('message_id', sent!.id)
  expect(sentMentions).toEqual([{ user_id: owner.id }])
  const { data: sentNotifications } = await ownerDb.from('trip_notifications')
    .select('kind').eq('source_id', sent!.id)
  expect(sentNotifications).toEqual([{ kind: 'mention' }])
  await expect.poll(async () => {
    const { data } = await viewerDb.from('trip_notifications').select('kind').eq('source_id', messageId)
    return data?.[0]?.kind
  }).toBe('mention')

  const { error: muteError } = await viewerDb.rpc('set_trip_chat_notifications',
    { p_trip_id: tripId, p_enabled: false })
  expect(muteError).toBeNull()
  const { data: mutedMessage, error: mutedError } = await ownerDb.from('trip_messages')
    .insert({ trip_id: tripId, sender_id: owner.id, content: 'Muted chat' }).select('id').single()
  expect(mutedError).toBeNull()
  const { data: mutedNotifications } = await viewerDb.from('trip_notifications')
    .select('id').eq('source_id', mutedMessage!.id)
  expect(mutedNotifications).toEqual([])
  const { data: cleanedUp, error: cleanupError } = await viewerDb.from('trip_messages')
    .delete().eq('id', sent!.id).select('id')
  expect(cleanupError).toBeNull()
  expect(cleanedUp).toHaveLength(1)
  const { data: removedNotifications } = await ownerDb.from('trip_notifications')
    .select('id').eq('source_id', sent!.id)
  expect(removedNotifications).toEqual([])

  const { data: post, error: postError } = await viewerDb.from('trip_posts')
    .insert({ trip_id: tripId, author_id: viewer.id, content: 'Trip memory' }).select('id').single()
  expect(postError).toBeNull()
  const postId = post!.id as string
  const { data: hiddenFeed } = await outsiderDb.from('trip_posts').select('id').eq('id', postId)
  expect(hiddenFeed).toEqual([])
  const { error: outsiderPostError } = await outsiderDb.from('trip_posts')
    .insert({ trip_id: tripId, author_id: outsider.id, content: 'Intrusion' })
  expect(outsiderPostError).not.toBeNull()
  const { error: viewerPinError } = await viewerDb.from('trip_posts')
    .update({ pinned: true }).eq('id', postId)
  expect(viewerPinError).not.toBeNull()
  const { error: ownerPinError } = await ownerDb.from('trip_posts')
    .update({ pinned: true }).eq('id', postId)
  expect(ownerPinError).toBeNull()
})
