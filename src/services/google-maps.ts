const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1'

const ALLOWED_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
])

export type MapLocationInput = {
  googleMapsUrl?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function isGoogleMapsUrl(value: string | null | undefined): boolean {
  if (!value) return false

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return false
    return true
  } catch {
    return false
  }
}

export function buildGoogleMapsSearchUrl(address: string | null | undefined): string | null {
  const query = address?.trim()
  if (!query) return null
  return `${GOOGLE_MAPS_SEARCH}&query=${encodeURIComponent(query)}`
}

export function buildGoogleMapsCoordinateUrl(
  latitude: number,
  longitude: number,
): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return `${GOOGLE_MAPS_SEARCH}&query=${encodeURIComponent(`${latitude},${longitude}`)}`
}

/**
 * Resolution order: explicit (valid) URL → address search → coordinates.
 * Phase 2 (Places Autocomplete) can populate these fields without touching callers.
 */
export function resolveGoogleMapsUrl(input: MapLocationInput): string | null {
  if (input.googleMapsUrl && isGoogleMapsUrl(input.googleMapsUrl)) {
    return input.googleMapsUrl.trim()
  }

  const byAddress = buildGoogleMapsSearchUrl(input.address)
  if (byAddress) return byAddress

  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    return buildGoogleMapsCoordinateUrl(input.latitude, input.longitude)
  }

  return null
}
