import { describe, expect, it } from 'vitest'
import { emailLoginSchema, emailOtpSchema } from './schemas'

describe('emailLoginSchema', () => {
  it('accepts a valid email', () => {
    expect(emailLoginSchema.safeParse({ email: 'traveler@example.com' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(emailLoginSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })
})

describe('emailOtpSchema', () => {
  it('accepts a six-digit code', () => {
    expect(emailOtpSchema.safeParse({ token: '123456' }).success).toBe(true)
    expect(emailOtpSchema.safeParse({ token: ' 654321 ' }).success).toBe(true)
  })

  it('rejects codes with the wrong shape', () => {
    expect(emailOtpSchema.safeParse({ token: '12345' }).success).toBe(false)
    expect(emailOtpSchema.safeParse({ token: '12345a' }).success).toBe(false)
  })
})
