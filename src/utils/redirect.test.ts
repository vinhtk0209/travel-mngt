import { describe, expect, it } from 'vitest'
import { buildAuthCallbackUrl, getSafeRedirectPath } from './redirect'

describe('getSafeRedirectPath', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(getSafeRedirectPath('/trips/123?tab=places#top')).toBe('/trips/123?tab=places#top')
  })

  it('falls back for external or protocol-relative URLs', () => {
    expect(getSafeRedirectPath('https://evil.example/path')).toBe('/dashboard')
    expect(getSafeRedirectPath('//evil.example/path')).toBe('/dashboard')
    expect(getSafeRedirectPath('/\\evil.example/path')).toBe('/dashboard')
  })

  it('falls back for empty values', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard')
    expect(getSafeRedirectPath('   ')).toBe('/dashboard')
  })
})

describe('buildAuthCallbackUrl', () => {
  it('builds an allowlisted callback URL with a safe redirect', () => {
    const url = new URL(buildAuthCallbackUrl('http://127.0.0.1:5173', '/trips/123'))
    expect(url.origin).toBe('http://127.0.0.1:5173')
    expect(url.pathname).toBe('/auth/callback')
    expect(url.searchParams.get('redirect')).toBe('/trips/123')
  })

  it('replaces unsafe redirects with the dashboard', () => {
    const url = new URL(
      buildAuthCallbackUrl('http://127.0.0.1:5173', 'https://evil.example/phish'),
    )
    expect(url.searchParams.get('redirect')).toBe('/dashboard')
  })
})
