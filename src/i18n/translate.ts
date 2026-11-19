import type { Locale } from '@/lib/supabase/database.types'
import { en, type TranslationKey } from './locales/en'
import { vi } from './locales/vi'

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, vi }

let activeLocale: Locale = 'en'

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale
}

export function getActiveLocale(): Locale {
  return activeLocale
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  )
}

export function translate(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: Locale = activeLocale,
): string {
  return interpolate(dictionaries[locale][key] ?? en[key], vars)
}

export type { TranslationKey }
