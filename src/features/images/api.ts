import { STORAGE_BUCKET, supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'
import { getErrorMessage } from '@/utils/errors'
import { translate } from '@/i18n/translate'
import {
  MAX_IMAGE_BYTES,
  compressImage,
  fileExtension,
  formatFileSize,
  normalizeImageFile,
  validateImageFile,
} from '@/utils/image'

export type TripItemImage = Tables<'trip_item_images'>

function describeUploadError(error: unknown): Error {
  const message = getErrorMessage(error, translate('images.errors.upload'))

  if (/maximum allowed size|payload too large|exceeded the maximum/i.test(message)) {
    return new Error(
      translate('images.errors.tooLarge', { size: formatFileSize(MAX_IMAGE_BYTES) }),
    )
  }
  if (/mime|content type|not supported/i.test(message)) {
    return new Error(translate('images.errors.type'))
  }
  if (/row-level security|not authorized|permission|denied/i.test(message)) {
    return new Error(translate('images.errors.permission'))
  }
  return new Error(message)
}

export async function uploadImage(options: {
  tripId: string
  folder: string
  file: File
}): Promise<{ path: string; fileName: string; mimeType: string }> {
  const invalid = validateImageFile(options.file)
  if (invalid) throw new Error(invalid)

  const source = normalizeImageFile(options.file)
  const compressed = await compressImage(source)
  if (compressed.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `This photo is still larger than ${formatFileSize(MAX_IMAGE_BYTES)} after compression. Try a smaller image.`,
    )
  }

  const extension = fileExtension(compressed)
  const path = `${options.tripId}/${options.folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed, {
    cacheControl: '3600',
    contentType: compressed.type,
    upsert: false,
  })

  if (error) throw describeUploadError(error)

  return { path, fileName: options.file.name, mimeType: compressed.type }
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
