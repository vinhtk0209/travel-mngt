export const DEFAULT_AUTH_REDIRECT = '/dashboard'

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  const raw = value?.trim()
  if (
    !raw ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\') ||
    /^[a-z][a-z0-9+.-]*:/i.test(raw)
  ) {
    return fallback
  }

  try {
    const base = 'https://wanderlist.local'
    const url = new URL(raw, base)
    if (url.origin !== base || !url.pathname.startsWith('/')) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function buildAuthCallbackUrl(origin: string, redirectPath?: string | null): string {
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('redirect', getSafeRedirectPath(redirectPath))
  return url.toString()
}
