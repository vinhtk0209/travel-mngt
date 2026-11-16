import { describe, expect, it } from 'vitest'
import { tripFormSchema } from './schemas'

describe('tripFormSchema', () => {
  it('accepts a valid trip', () => {
    const result = tripFormSchema.safeParse({
      name: 'Da Lat weekend',
      destination: 'Da Lat',
      description: 'Coffee and waterfalls',
      startDate: '2026-03-08',
      endDate: '2026-03-10',
    })
    expect(result.success).toBe(true)
  })

  it('requires a meaningful name', () => {
    expect(tripFormSchema.safeParse({ name: 'a' }).success).toBe(false)
  })

  it('rejects an end date before the start date', () => {
    const result = tripFormSchema.safeParse({
      name: 'Backwards trip',
      startDate: '2026-03-10',
      endDate: '2026-03-08',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('End date must be after the start date')
    }
  })

  it('allows empty optional dates', () => {
    expect(tripFormSchema.safeParse({ name: 'Someday', startDate: '', endDate: '' }).success).toBe(
      true,
    )
  })
})
