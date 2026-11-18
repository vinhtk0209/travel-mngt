import { supabase } from '@/lib/supabase/client'
import type { AssistantMode } from '@/lib/supabase/database.types'

export type AssistantTurn = {
  role: 'user' | 'model'
  text: string
}

export type AssistantAnswer = {
  text: string
  model: string
}

function describeFunctionError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'The trip assistant could not answer right now'
}

export async function fetchAssistantPreference(
  tripId: string,
  userId: string,
): Promise<AssistantMode | null> {
  const { data, error } = await supabase
    .from('trip_assistant_preferences')
    .select('mode')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.mode ?? null
}

export async function saveAssistantPreference(
  tripId: string,
  userId: string,
  mode: AssistantMode,
): Promise<void> {
  const { error } = await supabase
    .from('trip_assistant_preferences')
    .upsert(
      { trip_id: tripId, user_id: userId, mode },
      { onConflict: 'trip_id,user_id' },
    )

  if (error) throw error
}

export async function updateTripAssistantMode(
  tripId: string,
  mode: AssistantMode,
): Promise<void> {
  const { error } = await supabase.from('trips').update({ assistant_mode: mode }).eq('id', tripId)
  if (error) throw error
}

export async function askTripAssistant(input: {
  tripId: string
  turns: AssistantTurn[]
}): Promise<AssistantAnswer> {
  const { data, error } = await supabase.functions.invoke<AssistantAnswer>('trip-assistant', {
    body: { tripId: input.tripId, messages: input.turns },
  })

  if (error) {
    let message = describeFunctionError(error)
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string }
        if (payload.error) message = payload.error
      } catch {
        // Keep the SDK message when the body is not JSON.
      }
    }
    throw new Error(message)
  }

  if (!data || typeof data.text !== 'string' || data.text.trim().length === 0) {
    throw new Error('The trip assistant returned an empty answer')
  }

  return data
}
