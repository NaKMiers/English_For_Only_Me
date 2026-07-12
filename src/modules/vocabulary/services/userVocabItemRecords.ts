import type { UserVocabItemApiRecord } from '@/modules/vocabulary/types'

export function toUserVocabItemRecord(item: {
  _id: unknown
  correctCount?: number | null
  dueAt?: Date | null
  firstSeenAt?: Date | null
  knownAt?: Date | null
  knownReason?: UserVocabItemApiRecord['knownReason'] | null
  lastReviewedAt?: Date | null
  masteredAt?: Date | null
  masteredReason?: UserVocabItemApiRecord['masteredReason'] | null
  notes?: string | null
  recallStage?: number | null
  reviewCount?: number | null
  source?: UserVocabItemApiRecord['source'] | null
  status: UserVocabItemApiRecord['status']
  userId: string
  vocabEntryId: unknown
  wrongCount?: number | null
  createdAt: Date
  updatedAt: Date
}): UserVocabItemApiRecord {
  return {
    id: String(item._id),
    correctCount: item.correctCount ?? 0,
    dueAt: item.dueAt ?? null,
    firstSeenAt: item.firstSeenAt ?? item.createdAt,
    knownAt: item.knownAt ?? null,
    knownReason: item.knownReason ?? null,
    lastReviewedAt: item.lastReviewedAt ?? null,
    masteredAt: item.masteredAt ?? null,
    masteredReason: item.masteredReason ?? null,
    notes: item.notes ?? null,
    recallStage: (item.recallStage ??
      1) as UserVocabItemApiRecord['recallStage'],
    reviewCount: item.reviewCount ?? 0,
    source: item.source ?? 'manual',
    status: item.status,
    userId: item.userId,
    vocabEntryId: String(item.vocabEntryId),
    wrongCount: item.wrongCount ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}
