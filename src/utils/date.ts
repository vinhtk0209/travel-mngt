import {
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns'

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
  return date ? format(date, pattern) : fallback
}

export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = safeParse(startDate)
  const end = safeParse(endDate)

  if (!start && !end) return 'Dates to be decided'
  if (start && !end) return format(start, 'd MMM yyyy')
  if (!start && end) return `Until ${format(end, 'd MMM yyyy')}`

  if (start && end) {
    if (isSameDay(start, end)) return format(start, 'd MMM yyyy')
    const sameYear = start.getFullYear() === end.getFullYear()
    const sameMonth = sameYear && start.getMonth() === end.getMonth()

    if (sameMonth) {
      return `${format(start, 'd')} – ${format(end, 'd MMM yyyy')}`
    }
    return `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
  }

  return 'Dates to be decided'
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
      return 'Coming up'
    case 'ongoing':
      return 'Happening now'
    case 'past':
      return 'Memory lane'
    default:
      return 'Planning'
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
