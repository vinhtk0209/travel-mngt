import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateRange,
  getDaysUntilTrip,
  getTripTiming,
  getTripTimingLabel,
} from './date'

describe('formatDate', () => {
  it('formats ISO dates', () => {
    expect(formatDate('2026-03-08')).toBe('8 Mar 2026')
  })

  it('returns the fallback for missing or invalid values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatDate(undefined, 'd MMM', 'TBD')).toBe('TBD')
  })
})

describe('formatDateRange', () => {
  it('collapses same-month ranges', () => {
    expect(formatDateRange('2026-03-08', '2026-03-12')).toBe('8 – 12 Mar 2026')
  })

  it('handles a single day and different months', () => {
    expect(formatDateRange('2026-03-08', '2026-03-08')).toBe('8 Mar 2026')
    expect(formatDateRange('2026-03-30', '2026-04-02')).toBe('30 Mar – 2 Apr 2026')
  })

  it('handles partial and missing dates', () => {
    expect(formatDateRange('2026-03-08', null)).toBe('8 Mar 2026')
    expect(formatDateRange(null, '2026-03-12')).toBe('Until 12 Mar 2026')
    expect(formatDateRange(null, null)).toBe('Dates to be decided')
  })
})

describe('getTripTiming', () => {
  it('classifies past, ongoing and future trips', () => {
    expect(getTripTiming('2000-01-01', '2000-01-05')).toBe('past')
    expect(getTripTiming('2999-01-01', '2999-01-05')).toBe('upcoming')
    expect(getTripTiming(null, null)).toBe('undated')
  })

  it('provides friendly labels', () => {
    expect(getTripTimingLabel('upcoming')).toBe('Coming up')
    expect(getTripTimingLabel('ongoing')).toBe('Happening now')
    expect(getTripTimingLabel('past')).toBe('Memory lane')
    expect(getTripTimingLabel('undated')).toBe('Planning')
  })
})

describe('getDaysUntilTrip', () => {
  it('returns null without a date', () => {
    expect(getDaysUntilTrip(null)).toBeNull()
  })

  it('returns a positive number for future dates', () => {
    const days = getDaysUntilTrip('2999-01-01')
    expect(days).not.toBeNull()
    expect(days).toBeGreaterThan(0)
  })
})
