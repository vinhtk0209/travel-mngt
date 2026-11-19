import {
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns'
import { enUS, vi as viLocale } from 'date-fns/locale'
import type { Locale } from '@/lib/supabase/database.types'
import { translate } from '@/i18n/translate'

let activeLocale: Locale = 'en'

export function setDateLocale(locale: Locale): void {
  activeLocale = locale
}

export function getDateFnsLocale() {
  return activeLocale === 'vi' ? viLocale : enUS
}

const safeParse = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(
  value: string | null | undefined,
  pattern = 'd MMM yyyy',
  fallback = '—',
): string {
  const date = safeParse(value)
  return date ? format(date, pattern, { locale: getDateFnsLocale() }) : fallback
}

export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = safeParse(startDate)
  const end = safeParse(endDate)
  const locale = getDateFnsLocale()

  if (!start && !end) return translate('common.datesTbd')
  if (start && !end) return format(start, 'd MMM yyyy', { locale })
  if (!start && end) return translate('common.until', { date: format(end, 'd MMM yyyy', { locale }) })

  if (start && end) {
    if (isSameDay(start, end)) return format(start, 'd MMM yyyy', { locale })
    const sameYear = start.getFullYear() === end.getFullYear()
    const sameMonth = sameYear && start.getMonth() === end.getMonth()

    if (sameMonth) {
      return `${format(start, 'd', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`
    }
    return `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`
  }

  return translate('common.datesTbd')
}

export type TripTiming = 'upcoming' | 'ongoing' | 'past' | 'undated'

export function getTripTiming(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): TripTiming {
  const start = safeParse(startDate)
  const end = safeParse(endDate ?? startDate)
  const today = startOfDay(new Date())

  if (!start && !end) return 'undated'
  if (start && isAfter(startOfDay(start), today)) return 'upcoming'
  if (end && isBefore(startOfDay(end), today)) return 'past'
  return 'ongoing'
}

export function getTripTimingLabel(timing: TripTiming): string {
  switch (timing) {
    case 'upcoming':
      return translate('timing.upcoming')
    case 'ongoing':
      return translate('timing.ongoing')
    case 'past':
      return translate('timing.past')
    default:
      return translate('timing.planning')
  }
}

export function getDaysUntilTrip(startDate: string | null | undefined): number | null {
  const start = safeParse(startDate)
  if (!start) return null
  return differenceInCalendarDays(startOfDay(start), startOfDay(new Date()))
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, 'd MMM yyyy, HH:mm')
}
