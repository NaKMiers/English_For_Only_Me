import type { DictationTranslationApiRecord } from '@/modules/dictation/types'

export function toDictationTranslationRecord(translation: {
  _id: unknown
  createdAt: Date
  ownerId: string
  provider: DictationTranslationApiRecord['provider']
  segmentId: unknown
  sourceHash: string
  status: DictationTranslationApiRecord['status']
  targetLanguage: string
  text?: string | null
  unavailableReason?: string | null
  updatedAt: Date
}): DictationTranslationApiRecord {
  return {
    id: String(translation._id),
    createdAt: translation.createdAt,
    ownerId: translation.ownerId,
    provider: translation.provider,
    segmentId: String(translation.segmentId),
    sourceHash: translation.sourceHash,
    status: translation.status,
    targetLanguage: translation.targetLanguage,
    text: translation.text ?? '',
    unavailableReason: translation.unavailableReason ?? null,
    updatedAt: translation.updatedAt,
  }
}
