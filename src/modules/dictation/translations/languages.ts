export const DEFAULT_TRANSLATION_LANGUAGE = 'vi'

export const SUPPORTED_TRANSLATION_LANGUAGES = {
  vi: 'Vietnamese',
} as const

export type SupportedTranslationLanguage =
  keyof typeof SUPPORTED_TRANSLATION_LANGUAGES

export function isSupportedTranslationLanguage(
  value: string
): value is SupportedTranslationLanguage {
  return value in SUPPORTED_TRANSLATION_LANGUAGES
}

export function getTranslationLanguageLabel(
  language: SupportedTranslationLanguage
) {
  return SUPPORTED_TRANSLATION_LANGUAGES[language]
}
