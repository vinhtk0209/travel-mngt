export const TAG_COLOR_PRESETS = [
  { label: 'Peach', value: '#FFD9C9' },
  { label: 'Butter', value: '#FFE6B7' },
  { label: 'Mint', value: '#B8EADF' },
  { label: 'Sky', value: '#CFE6FF' },
  { label: 'Lavender', value: '#E4D9FF' },
  { label: 'Rose', value: '#FFD3E8' },
  { label: 'Sage', value: '#D8F3C4' },
  { label: 'Sand', value: '#F1E4CD' },
] as const

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function isValidHexColor(value: string | null | undefined): boolean {
  return Boolean(value && HEX_PATTERN.test(value))
}

export function normalizeHexColor(value: string | null | undefined, fallback = '#FFD9C9'): string {
  return isValidHexColor(value) ? (value as string).toUpperCase() : fallback
}

export type TagColorStyle = {
  backgroundColor: string
  borderColor: string
  color: string
}

export function getTagColorStyle(color: string | null | undefined): TagColorStyle {
  const normalized = normalizeHexColor(color)
  const red = Number.parseInt(normalized.slice(1, 3), 16)
  const green = Number.parseInt(normalized.slice(3, 5), 16)
  const blue = Number.parseInt(normalized.slice(5, 7), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return {
    backgroundColor: `${normalized}33`,
    borderColor: `${normalized}80`,
    color: luminance < 0.45 ? '#FFFFFF' : '#4A3B45',
  }
}

export function pickTagColor(index: number): string {
  return TAG_COLOR_PRESETS[index % TAG_COLOR_PRESETS.length].value
}
