import { describe, expect, it } from 'vitest'
import { getTagColorStyle, isValidHexColor, normalizeHexColor, pickTagColor } from './tags'

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

  it('builds readable pill styles', () => {
    const light = getTagColorStyle('#FFF6D8')
    expect(light.backgroundColor).toBe('#FFF6D833')
    expect(light.borderColor).toBe('#FFF6D880')

    const dark = getTagColorStyle('#111111')
    expect(dark.color).toBe('#FFFFFF')
  })

  it('cycles presets', () => {
    expect(pickTagColor(0)).toBe('#FFD9C9')
    expect(pickTagColor(8)).toBe('#FFD9C9')
  })
})
