import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import type { Tag } from '@/features/tags/api'
import type { TripItemImage } from '@/features/images/api'
import { removeStoredImages, uploadImage } from '@/features/images/api'
import { resolveGoogleMapsUrl } from '@/services/google-maps'
import type { PlaceFormValues } from './schemas'

export type TripItem = Tables<'trip_items'>

export type TripItemWithMeta = TripItem & {
  tags: Tag[]
  images: TripItemImage[]
}

export type PlaceInput = PlaceFormValues & {
  tagIds: string[]
}

function normalizeMapsUrl(input: PlaceInput): string | null {
  if (input.googleMapsUrl && input.googleMapsUrl.trim()) {
    return input.googleMapsUrl.trim()
  }
  return resolveGoogleMapsUrl({ address: input.address })
}

export async function fetchTripItems(tripId: string): Promise<TripItemWithMeta[]> {
  const { data: items, error } = await supabase
    .from('trip_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!items || items.length === 0) return []

  const itemIds = items.map((item) => item.id)

  const [linksResult, imagesResult] = await Promise.all([
    supabase.from('trip_item_tags').select('*').in('trip_item_id', itemIds),
    supabase
      .from('trip_item_images')
      .select('*')
      .in('trip_item_id', itemIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (linksResult.error) throw linksResult.error
  if (imagesResult.error) throw imagesResult.error

  const links = linksResult.data ?? []
  const images = imagesResult.data ?? []
  const tagIds = Array.from(new Set(links.map((link) => link.tag_id)))

  let tags: Tag[] = []
  if (tagIds.length > 0) {
    const { data, error: tagsError } = await supabase.from('tags').select('*').in('id', tagIds)
    if (tagsError) throw tagsError
    tags = data ?? []
  }

  const tagMap = new Map(tags.map((tag) => [tag.id, tag]))
  const tagsByItem = new Map<string, Tag[]>()
  for (const link of links) {
    const tag = tagMap.get(link.tag_id)
    if (!tag) continue
    const list = tagsByItem.get(link.trip_item_id) ?? []
    list.push(tag)
    tagsByItem.set(link.trip_item_id, list)
  }

  const imagesByItem = new Map<string, TripItemImage[]>()
  for (const image of images) {
    const list = imagesByItem.get(image.trip_item_id) ?? []
    list.push(image)
    imagesByItem.set(image.trip_item_id, list)
  }

  return items.map((item) => ({
    ...item,
    tags: tagsByItem.get(item.id) ?? [],
    images: imagesByItem.get(item.id) ?? [],
  }))
}

async function syncItemTags(itemId: string, tagIds: string[]): Promise<void> {
  const { data: existing, error } = await supabase
    .from('trip_item_tags')
    .select('tag_id')
    .eq('trip_item_id', itemId)

  if (error) throw error

  const currentIds = new Set((existing ?? []).map((link) => link.tag_id))
  const nextIds = new Set(tagIds)
  const toAdd = tagIds.filter((id) => !currentIds.has(id))
  const toRemove = Array.from(currentIds).filter((id) => !nextIds.has(id))

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('trip_item_tags')
      .delete()
      .eq('trip_item_id', itemId)
      .in('tag_id', toRemove)
    if (deleteError) throw deleteError
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from('trip_item_tags')
      .insert(toAdd.map((tagId) => ({ trip_item_id: itemId, tag_id: tagId })))
    if (insertError) throw insertError
  }
}

export async function uploadItemImages(
  tripId: string,
  itemId: string,
  files: File[],
  startOrder = 0,
): Promise<void> {
  if (files.length === 0) return

  const uploadedPaths: string[] = []

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const uploaded = await uploadImage({ tripId, folder: itemId, file })
      uploadedPaths.push(uploaded.path)

      const { error } = await supabase.from('trip_item_images').insert({
        trip_item_id: itemId,
        storage_path: uploaded.path,
        file_name: uploaded.fileName,
        sort_order: startOrder + index,
      })
      if (error) throw error
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      try {
        await removeStoredImages(uploadedPaths)
      } catch {
        // Best-effort cleanup of orphaned uploads.
      }
    }
    throw error
  }
}

export async function createPlace(input: {
  tripId: string
  userId: string
  values: PlaceInput
  files: File[]
}): Promise<TripItem> {
  const { data: item, error } = await supabase
    .from('trip_items')
    .insert({
      trip_id: input.tripId,
      created_by: input.userId,
      name: input.values.name,
      address: input.values.address || null,
      google_maps_url: normalizeMapsUrl(input.values),
      notes: input.values.notes || null,
      status: input.values.status,
    })
    .select('*')
    .single()

  if (error) throw error

  try {
    if (input.values.tagIds.length > 0) {
      const { error: tagError } = await supabase.from('trip_item_tags').insert(
        input.values.tagIds.map((tagId) => ({ trip_item_id: item.id, tag_id: tagId })),
      )
      if (tagError) throw tagError
    }

    await uploadItemImages(input.tripId, item.id, input.files)
    return item
  } catch (error) {
    await supabase.from('trip_items').delete().eq('id', item.id)
    throw error
  }
}

export async function updatePlace(input: {
  itemId: string
  tripId: string
  values: PlaceInput
  files: File[]
  existingImageCount: number
  removedImages: TripItemImage[]
}): Promise<void> {
  // Upload new images first so a failed upload leaves the place untouched.
  await uploadItemImages(input.tripId, input.itemId, input.files, input.existingImageCount)

  const { error } = await supabase
    .from('trip_items')
    .update({
      name: input.values.name,
      address: input.values.address || null,
      google_maps_url: normalizeMapsUrl(input.values),
      notes: input.values.notes || null,
      status: input.values.status,
    })
    .eq('id', input.itemId)

  if (error) throw error

  await syncItemTags(input.itemId, input.values.tagIds)

  for (const image of input.removedImages) {
    await deletePlaceImage(image)
  }
}

export async function deletePlace(itemId: string): Promise<void> {
  const { data: images, error } = await supabase
    .from('trip_item_images')
    .select('storage_path')
    .eq('trip_item_id', itemId)

  if (error) throw error

  const paths = (images ?? []).map((image) => image.storage_path)
  if (paths.length > 0) {
    try {
      await removeStoredImages(paths)
    } catch {
      // Continue removing the database record even if storage cleanup fails.
    }
  }

  const { error: deleteError } = await supabase.from('trip_items').delete().eq('id', itemId)
  if (deleteError) throw deleteError
}

export async function setPlaceStatus(itemId: string, status: 'todo' | 'completed'): Promise<void> {
  const { error } = await supabase.from('trip_items').update({ status }).eq('id', itemId)
  if (error) throw error
}

export async function deletePlaceImage(image: TripItemImage): Promise<void> {
  const { error } = await supabase.from('trip_item_images').delete().eq('id', image.id)
  if (error) throw error

  try {
    await removeStoredImages([image.storage_path])
  } catch {
    // The database row is the user-facing record; storage cleanup is best effort.
  }
}

export async function reorderPlaces(tripId: string, orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_trip_items', {
    p_trip_id: tripId,
    p_item_ids: orderedIds,
  })
  if (error) throw error
}
