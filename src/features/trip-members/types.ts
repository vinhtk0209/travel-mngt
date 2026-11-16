import type { Profile } from '@/features/auth/api'
import type { Tables, TripRole } from '@/lib/supabase/database.types'

export type TripMember = Tables<'trip_members'>

export type TripMemberWithProfile = TripMember & {
  profile: Profile | null
}

export const ROLE_LABELS: Record<TripRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<TripRole, string> = {
  owner: 'Full control, including members and deleting the trip.',
  editor: 'Can add and edit places, tags, photos and trip details.',
  viewer: 'Can look around and open maps. Read-only.',
}

export const ROLE_ORDER: Record<TripRole, number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
}
