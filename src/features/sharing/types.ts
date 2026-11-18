import type { TripRole } from '@/lib/supabase/database.types'

export type ShareRole = Extract<TripRole, 'editor' | 'viewer'>

export type TripShare = {
  token: string
  role: ShareRole
}

export type SharePreview = {
  id: string
  name: string
  destination: string
  description: string | null
  start_date: string | null
  end_date: string | null
  share_role: ShareRole
  owner_name: string
  member_count: number
  already_member: boolean
}
