import type { Locale } from '@/i18n/config'

/**
 * The app language as a model reads it, for "write in X" prompt lines. Every
 * AI call that writes for the learner names the app locale with it.
 */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  vi: 'Vietnamese',
}
