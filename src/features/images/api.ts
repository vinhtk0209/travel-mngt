import { STORAGE_BUCKET, supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import { compressImage, fileExtension } from '@/utils/image'

export type TripItemImage = Tables<'trip_item_images'>

export async function uploadImage(options: {
  tripId: string
  folder: string
  file: File
}): Promise<{ path: string; fileName: string }> {
  const compressed = await compressImage(options.file)
  const extension = fileExtension(compressed)
  const path = `${options.tripId}/${options.folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed, {
    cacheControl: '3600',
    contentType: compressed.type,
    upsert: false,
  })

  if (error) throw error

  return { path, fileName: options.file.name }
}

export async function removeStoredImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)
  if (error) throw error
}

export async function getSignedImageUrls(paths: string[]): Promise<Record<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)))
  if (uniquePaths.length === 0) return {}

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60)

  if (error) throw error

  const result: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      result[item.path] = item.signedUrl
    }
  }
  if (Object.keys(result).length === 0) {
    uniquePaths.forEach((path, index) => {
      const item = data?.[index]
      if (item?.signedUrl) result[path] = item.signedUrl
    })
  }
  return result
}
