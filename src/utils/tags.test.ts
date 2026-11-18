import { describe, expect, it } from 'vitest'
import {
  TAG_COLOR_PRESETS,
  getContrastRatio,
  getReadableTextColor,
  getTagColorStyle,
  isValidHexColor,
  normalizeHexColor,
  pickTagColor,
} from './tags'

describe('tag colors', () => {
  it('validates hex colors', () => {
    expect(isValidHexColor('#FFD9C9')).toBe(true)
    expect(isValidHexColor('#ffd9c9')).toBe(true)
    expect(isValidHexColor('FFD9C9')).toBe(false)
    expect(isValidHexColor('#FFF')).toBe(false)
  })

  it('normalizes values with a fallback', () => {
    expect(normalizeHexColor('#aabbcc')).toBe('#AABBCC')
    expect(normalizeHexColor('nope')).toBe('#FFD9C9')
    expect(normalizeHexColor(null, '#000000')).toBe('#000000')
  })

  it('builds opaque, readable pill styles in light mode', () => {
    const style = getTagColorStyle('#FFF6D8', 'light')
    expect(style.backgroundColor).toMatch(/^#[0-9A-F]{6}$/)
    expect(style.borderColor).toMatch(/^#[0-9A-F]{6}$/)
    expect(style.color).toBe('#241A21')
    expect(getContrastRatio(style.backgroundColor, style.color)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps every preset readable in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const preset of TAG_COLOR_PRESETS) {
        const style = getTagColorStyle(preset.value, theme)
        expect(getContrastRatio(style.backgroundColor, style.color)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('handles custom dark colours without losing the label', () => {
    const light = getTagColorStyle('#0B1F3A', 'light')
    const dark = getTagColorStyle('#0B1F3A', 'dark')
    expect(light.color).toBe(getReadableTextColor(light.backgroundColor))
    expect(dark.color).toBe(getReadableTextColor(dark.backgroundColor))
    expect(getContrastRatio(dark.backgroundColor, dark.color)).toBeGreaterThanOrEqual(4.5)
  })

  it('cycles presets', () => {
    expect(pickTagColor(0)).toBe('#FFD9C9')
    expect(pickTagColor(8)).toBe('#FFD9C9')
  })
})
