import { supabase } from '@/lib/supabase/client'
import type { TripMessage } from './utils'
import { translate } from '@/i18n/translate'

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

export async function sendTripMessage(input: {
  tripId: string
  senderId: string
  content: string
}): Promise<TripMessage> {
  const content = input.content.trim()
  if (!content) throw new Error(translate('chat.errors.empty'))
  if (content.length > 2000) throw new Error(translate('chat.errors.tooLong'))

  const { data, error } = await supabase
    .from('trip_messages')
    .insert({ trip_id: input.tripId, sender_id: input.senderId, content })
    .select('*')
    .single()

  if (error) throw error
  if (!data) throw new Error(translate('chat.errors.send'))
  return data
}
