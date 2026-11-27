// Codes offered in the picker for quick selection. Any structurally valid
// language code can still be added by hand; this list is only a convenience.
export const DEFAULT_DICTATION_LANGUAGE = 'en'

export const CURATED_TRANSLATION_LANGUAGE_CODES = [
  'vi',
  'en',
  'zh',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'pt',
  'it',
  'ru',
  'ar',
  'hi',
  'th',
  'id',
  'ms',
  'nl',
  'pl',
  'tr',
  'uk',
  'fa',
  'he',
  'sv',
  'cs',
  'ro',
  'el',
  'bn',
  'ta',
] as const

// BCP-47-ish: a 2-3 letter primary subtag, optional dash-separated subtags.
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i

export function normalizeTranslationLanguage(value: string) {
  return value.trim().toLowerCase()
}

export function isValidTranslationLanguage(value: string) {
  const code = normalizeTranslationLanguage(value)

  return (
    code.length >= 2 && code.length <= 12 && LANGUAGE_CODE_PATTERN.test(code)
  )
}

// Intl.DisplayNames is a runtime built-in (Node + browser). Cache one instance
// per display language; it turns 'vi' -> 'Vietnamese' (or 'Tiếng Việt' when
// displayed in Vietnamese) without us maintaining a name table.
const displayNamesByLocale = new Map<string, Intl.DisplayNames | null>()

function getDisplayNames(displayLocale: string) {
  const cached = displayNamesByLocale.get(displayLocale)

  if (cached !== undefined) return cached

  let names: Intl.DisplayNames | null

  try {
    names = new Intl.DisplayNames([displayLocale], { type: 'language' })
  } catch {
    names = null
  }

  displayNamesByLocale.set(displayLocale, names)

  return names
}

/**
 * Human name of a language code, written in `displayLocale` (English by
 * default, which the AI translation prompt relies on). UI callers pass the
 * learner's `INTL_LOCALES[locale]`.
 */
export function getLanguageLabel(code: string, displayLocale = 'en') {
  const normalized = normalizeTranslationLanguage(code)
  const names = getDisplayNames(displayLocale)

  if (names)
    try {
      const label = names.of(normalized)

      // Intl returns the code itself for unknown-but-valid codes; only use a
      // label when it actually resolved to something human-readable.
      if (label && label.toLowerCase() !== normalized) return label
    } catch {
      // Structurally invalid code - fall through to the raw code.
    }

  return normalized
}

export interface TranslationLanguageOption {
  code: string
  label: string
}

export function getCuratedLanguageOptions(): TranslationLanguageOption[] {
  return CURATED_TRANSLATION_LANGUAGE_CODES.map(code => ({
    code,
    label: getLanguageLabel(code),
  }))
}
