import { translate } from '@/i18n/translate'

const MAX_DIMENSION = 1920
const SKIP_BELOW_BYTES = 300 * 1024
const QUALITY = 0.82

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGES_PER_PLACE = 12
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
}

function detectImageType(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[extension] ?? ''
}

export function normalizeImageFile(file: File): File {
  const type = detectImageType(file)
  if (!file.type && type) {
    return new File([file], file.name, { type, lastModified: file.lastModified })
  }
  return file
}

export function validateImageFile(file: File): string | null {
  const type = detectImageType(file)
  if (type === 'image/heic' || type === 'image/heif' || /\.hei[cf]$/i.test(file.name)) {
    return translate('validation.image.heic')
  }
  if (!SUPPORTED_TYPES.has(type)) {
    return translate('validation.image.type')
  }
  if (file.size === 0) {
    return translate('validation.image.empty')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return translate('validation.image.tooLarge', {
      max: formatFileSize(MAX_IMAGE_BYTES),
      size: formatFileSize(file.size),
    })
  }
  return null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(translate('validation.image.readError')))
    }
    image.src = url
  })
}

/**
 * Compresses large photos client-side. GIFs (potential animation) and small
 * files are returned untouched. Falls back to the original file on failure.
 */
export async function compressImage(file: File): Promise<File> {
  if (!SUPPORTED_TYPES.has(file.type) || file.type === 'image/gif') return file
  if (file.size <= SKIP_BELOW_BYTES) return file

  try {
    const image = await loadImage(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', QUALITY)
    })
    if (!blob) return file

    const baseName = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

export function fileExtension(file: File): string {
  const match = /\.([a-z0-9]+)$/i.exec(file.name)
  if (match) return match[1].toLowerCase()
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  return 'jpg'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
