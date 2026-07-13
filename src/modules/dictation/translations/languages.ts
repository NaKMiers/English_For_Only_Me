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

// Intl.DisplayNames is a runtime built-in (Node + browser). Cache one instance;
// it turns 'vi' -> 'Vietnamese' without us maintaining a name table.
let displayNames: Intl.DisplayNames | null | undefined

function getDisplayNames() {
  if (displayNames !== undefined) return displayNames

  try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'language' })
  } catch {
    displayNames = null
  }

  return displayNames
}

export function getLanguageLabel(code: string) {
  const normalized = normalizeTranslationLanguage(code)
  const names = getDisplayNames()

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
