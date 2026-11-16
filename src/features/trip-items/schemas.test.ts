import { describe, expect, it } from 'vitest'
import { placeFormSchema } from './schemas'

describe('placeFormSchema', () => {
  it('accepts a minimal place', () => {
    expect(placeFormSchema.safeParse({ name: 'Banh mi stall', status: 'todo' }).success).toBe(true)
  })

  it('requires a name with at least two characters', () => {
    expect(placeFormSchema.safeParse({ name: ' ', status: 'todo' }).success).toBe(false)
  })

  it('accepts Google Maps links and rejects other links', () => {
    expect(
      placeFormSchema.safeParse({
        name: 'Lookout',
        status: 'todo',
        googleMapsUrl: 'https://maps.app.goo.gl/abc123',
      }).success,
    ).toBe(true)

    expect(
      placeFormSchema.safeParse({
        name: 'Lookout',
        status: 'todo',
        googleMapsUrl: 'https://example.com/place',
      }).success,
    ).toBe(false)
  })

  it('only allows the two supported statuses', () => {
    expect(placeFormSchema.safeParse({ name: 'Cafe', status: 'maybe' }).success).toBe(false)
  })
})
