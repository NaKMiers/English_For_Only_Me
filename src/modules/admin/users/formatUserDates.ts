import { INTL_LOCALES, type Locale } from '@/i18n/config'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/**
 * "3 days ago" / "3 ngày trước" for an ISO date, measured from `now` (passed
 * in from the server render so server and client agree), or null.
 */
export function formatRelativeDate(
  iso: string | null,
  now: number,
  locale: Locale
): string | null {
  if (!iso) return null

  const diff = Date.parse(iso) - now
  const formatter = new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
    numeric: 'auto',
  })

  for (const [unit, size] of UNITS)
    if (Math.abs(diff) >= size)
      return formatter.format(Math.round(diff / size), unit)

  return formatter.format(0, 'minute')
}

/** "28 Nov 2026" / "28 thg 11, 2026" for an ISO date, or null. */
export function formatCalendarDate(iso: string | null, locale: Locale) {
  if (!iso) return null

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}
