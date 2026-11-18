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

/** Surface the pill is drawn on, per theme. Matches --color-surface in index.css. */
const THEME_SURFACES = {
  light: '#FFFFFF',
  dark: '#201A24',
} as const

const DARK_TEXT = '#241A21'
const LIGHT_TEXT = '#FFFFFF'

export type TagTheme = 'light' | 'dark'

export function isValidHexColor(value: string | null | undefined): boolean {
  return Boolean(value && HEX_PATTERN.test(value))
}

export function normalizeHexColor(value: string | null | undefined, fallback = '#FFD9C9'): string {
  return isValidHexColor(value) ? (value as string).toUpperCase() : fallback
}

type Rgb = { r: number; g: number; b: number }

function hexToRgb(value: string): Rgb {
  const hex = normalizeHexColor(value)
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

function blend(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  }
}

function channelLuminance(value: number): number {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(color: string): number {
  const { r, g, b } = hexToRgb(color)
  return (
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  )
}

/**
 * WCAG 2.1 contrast ratio between two hex colours (1–21). Used to pick a
 * readable foreground for any user-selected tag colour instead of assuming
 * the palette is always pastel.
 */
export function getContrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export function getReadableTextColor(background: string): string {
  return getContrastRatio(background, LIGHT_TEXT) >= getContrastRatio(background, DARK_TEXT)
    ? LIGHT_TEXT
    : DARK_TEXT
}

export type TagColorStyle = {
  backgroundColor: string
  borderColor: string
  color: string
}

/**
 * Builds an opaque, theme-aware pill style. An opaque composite is used (rather
 * than a translucent hex) so the foreground contrast is predictable in both
 * light and dark mode.
 */
export function getTagColorStyle(
  color: string | null | undefined,
  theme: TagTheme = 'light',
): TagColorStyle {
  const normalized = normalizeHexColor(color)
  const base = hexToRgb(THEME_SURFACES[theme])
  const backgroundColor = rgbToHex(blend(hexToRgb(normalized), base, theme === 'dark' ? 0.3 : 0.24))
  const borderColor = rgbToHex(blend(hexToRgb(normalized), base, theme === 'dark' ? 0.62 : 0.55))

  return {
    backgroundColor,
    borderColor,
    color: getReadableTextColor(backgroundColor),
  }
}

export function pickTagColor(index: number): string {
  return TAG_COLOR_PRESETS[index % TAG_COLOR_PRESETS.length].value
}
