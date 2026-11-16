import type { Tables } from '@/lib/supabase/database.types'
import type { TripMemberWithProfile } from '@/features/trip-members/types'

export type Trip = Tables<'trips'>

export type DashboardTrip = {
  trip: Trip
  members: TripMemberWithProfile[]
  totalPlaces: number
  completedPlaces: number
  isOwner: boolean
}
