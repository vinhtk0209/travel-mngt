import { describe, expect, it } from 'vitest'
import { basicTravelReply } from './basic-replies'

describe('basicTravelReply', () => {
  it('answers packing questions without a remote model', () => {
    const reply = basicTravelReply('What should I pack for a beach trip?', {
      destination: 'Da Nang',
    })
    expect(reply.topic).toBe('packing')
    expect(reply.text).toContain('Da Nang')
    expect(reply.ideas).toHaveLength(0)
  })

  it('answers budget questions', () => {
    const reply = basicTravelReply('How do I budget for this trip?')
    expect(reply.topic).toBe('budget')
    expect(reply.text.length).toBeGreaterThan(40)
  })

  it('keeps idea suggestions for vibe/duration prompts', () => {
    const reply = basicTravelReply('3 days by the beach')
    expect(reply.topic).toBe('ideas')
    expect(reply.ideas).toHaveLength(4)
  })

  it('is explicit when a question is out of scope', () => {
    const reply = basicTravelReply('Can you write my JavaScript homework?')
    expect(reply.topic).toBe('fallback')
    expect(reply.text).toContain('Basic mode')
    expect(reply.ideas).toHaveLength(0)
  })

  it('greets in basic mode and points at the AI option', () => {
    const reply = basicTravelReply('hello')
    expect(reply.topic).toBe('greeting')
    expect(reply.text).toContain('Gemini')
  })
})
