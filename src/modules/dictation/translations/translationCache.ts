import type { DictationTranslationApiRecord } from '@/modules/dictation/types'

export function findCachedTranslation({
  segmentId,
  sourceHash,
  targetLanguage,
  translations,
}: {
  segmentId: string
  sourceHash: string
  targetLanguage: string
  translations: DictationTranslationApiRecord[]
}) {
  return (
    translations.find(
      translation =>
        translation.segmentId === segmentId &&
        translation.sourceHash === sourceHash &&
        translation.targetLanguage === targetLanguage
    ) ?? null
  )
}

export function getTranslationCacheMode(
  translation: DictationTranslationApiRecord | null
) {
  return translation ? 'hit' : 'miss'
}
