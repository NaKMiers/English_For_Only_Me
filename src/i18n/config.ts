/**
 * Locale settings shared by server and client code. The learner's choice
 * lives in a cookie, so server components render the right language on the
 * first paint and routes stay the same in both languages.
 */
export const LOCALES = ['en', 'vi'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_COOKIE = 'efom-locale'

/** One year: the choice should outlive any study break. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** BCP 47 tags for `Intl` date and number formatting in each UI language. */
export const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  vi: 'vi-VN',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale)
}

/** Any unknown or missing value falls back to English. */
export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}
