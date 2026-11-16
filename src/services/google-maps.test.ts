import { describe, expect, it } from 'vitest'
import {
  buildGoogleMapsCoordinateUrl,
  buildGoogleMapsSearchUrl,
  isGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from './google-maps'

describe('isGoogleMapsUrl', () => {
  it('accepts Google Maps and short-link hosts', () => {
    expect(isGoogleMapsUrl('https://www.google.com/maps/place/Da+Lat')).toBe(true)
    expect(isGoogleMapsUrl('https://maps.app.goo.gl/abc123')).toBe(true)
    expect(isGoogleMapsUrl('https://maps.google.com/?q=Da+Lat')).toBe(true)
  })

  it('rejects unrelated or unsafe URLs', () => {
    expect(isGoogleMapsUrl('https://example.com/maps')).toBe(false)
    expect(isGoogleMapsUrl('javascript:alert(1)')).toBe(false)
    expect(isGoogleMapsUrl('google.com/maps')).toBe(false)
    expect(isGoogleMapsUrl(null)).toBe(false)
    expect(isGoogleMapsUrl('')).toBe(false)
  })
})

describe('search and coordinate URLs', () => {
  it('encodes addresses', () => {
    expect(buildGoogleMapsSearchUrl('  Da Lat, Vietnam ')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Da%20Lat%2C%20Vietnam',
    )
    expect(buildGoogleMapsSearchUrl('   ')).toBeNull()
  })

  it('validates coordinate ranges', () => {
    expect(buildGoogleMapsCoordinateUrl(11.94, 108.45)).toBe(
      'https://www.google.com/maps/search/?api=1&query=11.94%2C108.45',
    )
    expect(buildGoogleMapsCoordinateUrl(200, 108)).toBeNull()
    expect(buildGoogleMapsCoordinateUrl(Number.NaN, 108)).toBeNull()
  })
})

describe('resolveGoogleMapsUrl', () => {
  it('prefers a valid explicit URL', () => {
    expect(
      resolveGoogleMapsUrl({
        googleMapsUrl: 'https://maps.app.goo.gl/abc123',
        address: 'Da Lat',
      }),
    ).toBe('https://maps.app.goo.gl/abc123')
  })

  it('falls back to address then coordinates', () => {
    expect(resolveGoogleMapsUrl({ googleMapsUrl: 'https://example.com', address: 'Da Lat' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Da%20Lat',
    )
    expect(resolveGoogleMapsUrl({ latitude: 11.94, longitude: 108.45 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=11.94%2C108.45',
    )
    expect(resolveGoogleMapsUrl({})).toBeNull()
  })
})
