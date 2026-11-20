import { supabase } from '@/lib/supabase/client'
import type { ChatBackground } from '@/lib/supabase/database.types'
import { uploadImage, removeStoredImages } from '@/features/images/api'
import { translate } from '@/i18n/translate'
import type {
  TripMessage,
  TripMessageAttachment,
  TripMessageReaction,
} from './utils'

export async function fetchTripMessages(tripId: string): Promise<TripMessage[]> {
  const { data, error } = await supabase
    .from('trip_messages')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw error
  return data ?? []
}

export async function fetchTripMessageAttachments(
  messageIds: string[],
): Promise<TripMessageAttachment[]> {
  if (messageIds.length === 0) return []

  const { data, error } = await supabase
    .from('trip_message_attachments')
    .select('*')
    .in('message_id', messageIds)

  if (error) throw error
  return data ?? []
}

export async function fetchTripMessageReactions(
  messageIds: string[],
): Promise<TripMessageReaction[]> {
  if (messageIds.length === 0) return []

  const { data, error } = await supabase
    .from('trip_message_reactions')
    .select('*')
    .in('message_id', messageIds)

  if (error) throw error
  return data ?? []
}

export type SendTripMessageResult = {
  message: TripMessage
  attachment: TripMessageAttachment | null
}

export async function sendTripMessage(input: {
  tripId: string
  senderId: string
  content: string
  file?: File | null
}): Promise<SendTripMessageResult> {
  const content = input.content.trim()
  if (!content && !input.file) throw new Error(translate('chat.errors.empty'))
  if (content.length > 2000) throw new Error(translate('chat.errors.tooLong'))

  const { data: message, error } = await supabase
    .from('trip_messages')
    .insert({ trip_id: input.tripId, sender_id: input.senderId, content })
    .select('*')
    .single()

  if (error) throw error
  if (!message) throw new Error(translate('chat.errors.send'))

  if (!input.file) return { message, attachment: null }

  let storagePath: string | null = null
  try {
    const uploaded = await uploadImage({
      tripId: input.tripId,
      folder: 'chat',
      file: input.file,
    })
    storagePath = uploaded.path

    const { data: attachment, error: attachmentError } = await supabase
      .from('trip_message_attachments')
      .insert({
        message_id: message.id,
        storage_path: uploaded.path,
        file_name: uploaded.fileName,
        mime_type: uploaded.mimeType,
      })
      .select('*')
      .single()

    if (attachmentError) throw attachmentError
    return { message, attachment }
  } catch (uploadError) {
    if (storagePath) {
      try {
        await removeStoredImages([storagePath])
      } catch {
        // Best-effort cleanup; the orphan is private and harmless.
      }
    }
    await supabase.from('trip_messages').delete().eq('id', message.id)
    throw uploadError
  }
}

export async function toggleTripMessageReaction(input: {
  messageId: string
  userId: string
  emoji: string
  currentEmoji?: string
}): Promise<TripMessageReaction | null> {
  if (input.currentEmoji === input.emoji) {
    const { error } = await supabase
      .from('trip_message_reactions')
      .delete()
      .eq('message_id', input.messageId)
      .eq('user_id', input.userId)
    if (error) throw error
    return null
  }

  const { data, error } = await supabase
    .from('trip_message_reactions')
    .upsert(
      {
        message_id: input.messageId,
        user_id: input.userId,
        emoji: input.emoji,
      },
      { onConflict: 'message_id,user_id' },
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateTripChatBackground(input: {
  tripId: string
  preset: ChatBackground
  file?: File | null
  currentPath?: string | null
}): Promise<{ preset: ChatBackground; path: string | null }> {
  let uploadedPath: string | null = null

  if (input.file) {
    const uploaded = await uploadImage({
      tripId: input.tripId,
      folder: 'chat-background',
      file: input.file,
    })
    uploadedPath = uploaded.path
  }

  const { error } = await supabase
    .from('trips')
    .update({
      chat_background: input.file ? 'default' : input.preset,
      chat_background_path: uploadedPath,
    })
    .eq('id', input.tripId)
    .select('id')
    .single()

  if (error) {
    if (uploadedPath) {
      try {
        await removeStoredImages([uploadedPath])
      } catch {
        // Best-effort cleanup of the unused wallpaper.
      }
    }
    throw error
  }

  if (input.currentPath && input.currentPath !== uploadedPath) {
    try {
      await removeStoredImages([input.currentPath])
    } catch {
      // The previous wallpaper can be retried by storage cleanup later.
    }
  }

  return {
    preset: input.file ? 'default' : input.preset,
    path: uploadedPath,
  }
}
