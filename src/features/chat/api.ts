import { supabase } from '@/lib/supabase/client'
import type { TripMessage } from './utils'

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
  if (!content) throw new Error('Write a message first')
  if (content.length > 2000) throw new Error('Messages are limited to 2000 characters')

  const { data, error } = await supabase
    .from('trip_messages')
    .insert({ trip_id: input.tripId, sender_id: input.senderId, content })
    .select('*')
    .single()

  if (error) throw error
  if (!data) throw new Error('The message could not be sent')
  return data
}
