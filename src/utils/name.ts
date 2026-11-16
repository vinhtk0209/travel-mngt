export function getInitials(name: string | null | undefined, fallback = '?'): string {
  const cleaned = name?.trim()
  if (!cleaned) return fallback

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const AVATAR_GRADIENTS = [
  'from-coral-300 to-butter-300',
  'from-mint-300 to-sky-300',
  'from-lavender-300 to-coral-300',
  'from-sky-300 to-mint-300',
  'from-butter-300 to-coral-300',
  'from-lavender-300 to-mint-300',
] as const

export function getAvatarGradient(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}
