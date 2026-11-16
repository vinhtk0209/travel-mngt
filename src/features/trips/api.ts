import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/features/auth/api'
import type { TripMemberWithProfile } from '@/features/trip-members/types'
import { ROLE_ORDER } from '@/features/trip-members/types'
import type { Tables } from '@/lib/supabase/database.types'
import { removeStoredImages, uploadImage } from '@/features/images/api'
import type { DashboardTrip, Trip } from './types'
import type { TripFormValues } from './schemas'

type TripItemSummary = Pick<Tables<'trip_items'>, 'id' | 'trip_id' | 'status'>

function mapTripValues(values: TripFormValues) {
  return {
    name: values.name.trim(),
    destination: values.destination?.trim() ?? '',
    description: values.description?.trim() || null,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
  }
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchDashboardTrips(userId: string): Promise<DashboardTrip[]> {
  const trips = await fetchTrips()
  if (trips.length === 0) return []

  const tripIds = trips.map((trip) => trip.id)

  const [membersResult, itemsResult] = await Promise.all([
    supabase.from('trip_members').select('*').in('trip_id', tripIds),
    supabase.from('trip_items').select('id, trip_id, status').in('trip_id', tripIds),
  ])

  if (membersResult.error) throw membersResult.error
  if (itemsResult.error) throw itemsResult.error

  const members = membersResult.data ?? []
  const items: TripItemSummary[] = itemsResult.data ?? []

  const userIds = Array.from(new Set(members.map((member) => member.user_id)))
  let profiles: Profile[] = []
  if (userIds.length > 0) {
    const { data, error } = await supabase.from('profiles').select('*').in('id', userIds)
    if (error) throw error
    profiles = data ?? []
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const membersByTrip = new Map<string, TripMemberWithProfile[]>()
  for (const member of members) {
    const list = membersByTrip.get(member.trip_id) ?? []
    list.push({ ...member, profile: profileMap.get(member.user_id) ?? null })
    membersByTrip.set(member.trip_id, list)
  }
  for (const list of membersByTrip.values()) {
    list.sort((a, b) => {
      const roleDelta = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      if (roleDelta !== 0) return roleDelta
      return (a.profile?.display_name ?? '').localeCompare(b.profile?.display_name ?? '')
    })
  }

  const itemStats = new Map<string, { total: number; completed: number }>()
  for (const item of items) {
    const stats = itemStats.get(item.trip_id) ?? { total: 0, completed: 0 }
    stats.total += 1
    if (item.status === 'completed') stats.completed += 1
    itemStats.set(item.trip_id, stats)
  }

  return trips.map((trip) => {
    const stats = itemStats.get(trip.id) ?? { total: 0, completed: 0 }
    return {
      trip,
      members: membersByTrip.get(trip.id) ?? [],
      totalPlaces: stats.total,
      completedPlaces: stats.completed,
      isOwner: trip.owner_id === userId,
    }
  })
}

export async function fetchTrip(tripId: string): Promise<Trip> {
  const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('This trip could not be found, or you no longer have access.')
  return data
}

export async function createTrip(input: {
  values: TripFormValues
  ownerId: string
  coverFile?: File | null
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...mapTripValues(input.values), owner_id: input.ownerId })
    .select('*')
    .single()

  if (error) throw error

  if (!input.coverFile) return data

  try {
    const cover = await uploadImage({
      tripId: data.id,
      folder: 'cover',
      file: input.coverFile,
    })
    const { data: updated, error: updateError } = await supabase
      .from('trips')
      .update({ cover_image: cover.path })
      .eq('id', data.id)
      .select('*')
      .single()

    if (updateError) throw updateError
    return updated
  } catch (uploadError) {
    await supabase.from('trips').delete().eq('id', data.id)
    throw uploadError
  }
}

export async function updateTrip(input: {
  tripId: string
  values: TripFormValues
  coverFile?: File | null
  previousCoverPath?: string | null
  removeCover?: boolean
}): Promise<Trip> {
  let coverPath = input.previousCoverPath ?? null

  if (input.removeCover && coverPath) {
    try {
      await removeStoredImages([coverPath])
    } catch {
      // Losing the old file is not fatal; the database reference is cleared below.
    }
    coverPath = null
  }

  if (input.coverFile) {
    const cover = await uploadImage({
      tripId: input.tripId,
      folder: 'cover',
      file: input.coverFile,
    })
    if (input.previousCoverPath) {
      try {
        await removeStoredImages([input.previousCoverPath])
      } catch {
        // Non-fatal orphaned object.
      }
    }
    coverPath = cover.path
  }

  const { data, error } = await supabase
    .from('trips')
    .update({ ...mapTripValues(input.values), cover_image: coverPath })
    .eq('id', input.tripId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('cover_image')
    .eq('id', tripId)
    .maybeSingle()

  if (tripError) throw tripError

  const { data: items, error: itemsError } = await supabase
    .from('trip_items')
    .select('id')
    .eq('trip_id', tripId)

  if (itemsError) throw itemsError

  let imagePaths: string[] = []
  if (items && items.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from('trip_item_images')
      .select('storage_path')
      .in(
        'trip_item_id',
        items.map((item) => item.id),
      )

    if (imagesError) throw imagesError
    imagePaths = (images ?? []).map((image) => image.storage_path)
  }

  const paths = [...(trip?.cover_image ? [trip.cover_image] : []), ...imagePaths]
  if (paths.length > 0) {
    try {
      await removeStoredImages(paths)
    } catch {
      // Keep going: the trip and its permission scope are being removed anyway.
    }
  }

  const { error } = await supabase.from('trips').delete().eq('id', tripId)
  if (error) throw error
}
