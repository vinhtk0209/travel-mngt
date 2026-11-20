import type { CSSProperties } from 'react'
import type { ChatBackground } from '@/lib/supabase/database.types'

const presets: Record<ChatBackground, string | null> = {
  default: null,
  sunset:
    'linear-gradient(135deg, rgba(255, 112, 89, 0.2), rgba(255, 209, 102, 0.28) 48%, rgba(255, 255, 255, 0.7))',
  mint: 'linear-gradient(135deg, rgba(111, 207, 177, 0.22), rgba(174, 224, 255, 0.28) 52%, rgba(255, 255, 255, 0.72))',
  lavender:
    'linear-gradient(135deg, rgba(178, 157, 235, 0.24), rgba(255, 184, 205, 0.22) 52%, rgba(255, 255, 255, 0.72))',
}

export const CHAT_BACKGROUND_OPTIONS: ChatBackground[] = [
  'default',
  'sunset',
  'mint',
  'lavender',
]

export function getChatBackgroundStyle(
  preset: ChatBackground,
  imageUrl: string | undefined,
): CSSProperties | undefined {
  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.58)), url("${imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }

  const gradient = presets[preset]
  return gradient ? { backgroundImage: gradient } : undefined
}

export function getChatBackgroundSwatch(preset: ChatBackground): CSSProperties {
  const gradient = presets[preset]
  return gradient
    ? { backgroundImage: gradient }
    : { backgroundImage: 'linear-gradient(135deg, #fff7ef, #f4efe6)' }
}
