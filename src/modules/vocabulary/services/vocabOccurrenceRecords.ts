import type { VocabOccurrenceApiRecord } from '@/modules/vocabulary/types'

export function toVocabOccurrenceRecord(occurrence: {
  _id: unknown
  attemptId?: unknown
  contextSentence?: string | null
  reason: VocabOccurrenceApiRecord['reason']
  segmentId?: unknown
  selectedText?: string | null
  userId: string
  videoId?: unknown
  vocabEntryId: unknown
  createdAt: Date
  updatedAt: Date
}): VocabOccurrenceApiRecord {
  return {
    id: String(occurrence._id),
    attemptId: occurrence.attemptId ? String(occurrence.attemptId) : null,
    contextSentence: occurrence.contextSentence ?? null,
    reason: occurrence.reason,
    segmentId: occurrence.segmentId ? String(occurrence.segmentId) : null,
    selectedText: occurrence.selectedText ?? null,
    userId: occurrence.userId,
    videoId: occurrence.videoId ? String(occurrence.videoId) : null,
    vocabEntryId: String(occurrence.vocabEntryId),
    createdAt: occurrence.createdAt,
    updatedAt: occurrence.updatedAt,
  }
}
