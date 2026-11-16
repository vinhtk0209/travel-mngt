import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

export type Tag = Tables<'tags'>

export async function fetchTripTags(tripId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('trip_id', tripId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createTag(input: {
  tripId: string
  name: string
  color: string
}): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({
      trip_id: input.tripId,
      name: input.name.trim(),
      color: input.color,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateTag(
  tagId: string,
  input: { name: string; color: string },
): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .update({ name: input.name.trim(), color: input.color })
    .eq('id', tagId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) throw error
}
