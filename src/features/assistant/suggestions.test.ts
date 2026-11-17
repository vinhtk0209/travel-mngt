import { describe, expect, it } from 'vitest'
import { suggestTrips } from './suggestions'

describe('suggestTrips', () => {
  it('favours beach ideas for a beach prompt', () => {
    const reply = suggestTrips('3 days by the beach')
    expect(reply.ideas.some((idea) => idea.tags.includes('beach'))).toBe(true)
  })

  it('honours a named destination', () => {
    const reply = suggestTrips('I want to go to Hoi An')
    expect(reply.ideas[0]?.destination).toContain('Hoi An')
  })

  it('combines budget, vibe and duration', () => {
    const reply = suggestTrips('cheap mountain trip for 4 days')
    expect(reply.ideas[0]?.tags).toContain('mountain')
    expect(reply.ideas[0]?.budget).toBe('budget')
  })

  it('always returns a usable list', () => {
    const reply = suggestTrips('hello there')
    expect(reply.ideas).toHaveLength(4)
    expect(reply.text.length).toBeGreaterThan(0)
  })
})
