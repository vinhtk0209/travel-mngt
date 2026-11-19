import { translate } from '@/i18n/translate'

type ErrorWithMessage = {
  message?: unknown
  details?: unknown
  hint?: unknown
  error_description?: unknown
}

export function getErrorMessage(
  error: unknown,
  fallback = translate('errors.generic'),
): string {
  if (!error) return fallback

  if (typeof error === 'string') return error

  if (error instanceof Error && error.message) return error.message

  if (typeof error === 'object') {
    const candidate = error as ErrorWithMessage
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message
    }
    if (typeof candidate.error_description === 'string' && candidate.error_description.trim()) {
      return candidate.error_description
    }
    if (typeof candidate.details === 'string' && candidate.details.trim()) {
      return candidate.details
    }
  }

  return fallback
}

export function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; message?: unknown }
  return (
    candidate.code === '42501' ||
    (typeof candidate.message === 'string' &&
      /permission|row-level security|not authorized/i.test(candidate.message))
  )
}
