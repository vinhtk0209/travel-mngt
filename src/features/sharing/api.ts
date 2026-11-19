import { supabase } from '@/lib/supabase/client'
import { translate } from '@/i18n/translate'
import type { SharePreview, ShareRole, TripShare } from './types'

export async function getOrCreateTripShare(
  tripId: string,
  role: ShareRole,
): Promise<TripShare> {
  const { data, error } = await supabase.rpc('get_or_create_trip_share', {
    p_trip_id: tripId,
    p_role: role,
  })

  if (error) throw error
  const share = data as TripShare | null
  if (!share?.token) throw new Error(translate('sharing.errors.create'))
  return share
}

export async function setTripShareRole(tripId: string, role: ShareRole): Promise<void> {
  const { error } = await supabase.rpc('set_trip_share_role', {
    p_trip_id: tripId,
    p_role: role,
  })
  if (error) throw error
}

export async function regenerateTripShareToken(tripId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_trip_share_token', {
    p_trip_id: tripId,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error(translate('sharing.errors.regenerate'))
  return data
}

export async function disableTripShare(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('disable_trip_share', { p_trip_id: tripId })
  if (error) throw error
}

export async function resolveTripShare(token: string): Promise<SharePreview | null> {
  const { data, error } = await supabase.rpc('resolve_trip_share', { p_token: token })
  if (error) throw error
  return (data as SharePreview | null) ?? null
}

export async function joinTripByShare(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_trip_by_share', { p_token: token })
  if (error) throw error
  if (typeof data !== 'string') throw new Error(translate('sharing.errors.join'))
  return data
}
