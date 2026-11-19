import { AVATAR_BUCKET, supabase } from '@/lib/supabase/client'
import { translate } from '@/i18n/translate'
import type { Tables } from '@/lib/supabase/database.types'
import {
  MAX_IMAGE_BYTES,
  compressImage,
  fileExtension,
  normalizeImageFile,
  validateImageFile,
} from '@/utils/image'

export type Profile = Tables<'profiles'>

const AVATAR_BUCKET_LIMIT = 5 * 1024 * 1024

export function resolveAvatarUrl(
  path: string | null | undefined,
  urls: Record<string, string>,
): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return urls[path]
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const invalid = validateImageFile(file)
  if (invalid) throw new Error(invalid)

  const compressed = await compressImage(normalizeImageFile(file))
  if (compressed.size > Math.min(MAX_IMAGE_BYTES, AVATAR_BUCKET_LIMIT)) {
    throw new Error(translate('avatars.errors.tooLarge'))
  }

  const path = `${userId}/avatar-${crypto.randomUUID()}.${fileExtension(compressed)}`
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, compressed, {
      cacheControl: '3600',
      contentType: compressed.type,
      upsert: false,
    })

  if (uploadError) {
    if (/mime|content type|not supported/i.test(uploadError.message)) {
      throw new Error(translate('avatars.errors.type'))
    }
    if (/row-level security|not authorized|permission|denied/i.test(uploadError.message)) {
      throw new Error(translate('avatars.errors.ownOnly'))
    }
    throw new Error(uploadError.message)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', userId)

  if (profileError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path])
    throw profileError
  }

  return path
}

export async function removeAvatar(userId: string, path: string | null | undefined): Promise<void> {
  if (path && !/^https?:\/\//i.test(path)) {
    const { error: storageError } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
    if (storageError) throw storageError
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)

  if (error) throw error
}

export async function deleteAvatarObject(path: string): Promise<void> {
  if (!path || /^https?:\/\//i.test(path)) return
  await supabase.storage.from(AVATAR_BUCKET).remove([path])
}

export async function getSignedAvatarUrls(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((path) => path && !/^https?:\/\//i.test(path))))
  if (unique.length === 0) return {}

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(unique, 60 * 60)

  if (error) throw error

  const result: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result[item.path] = item.signedUrl
  }
  return result
}
