import {
  VOCAB_RECALL_STAGE_INTERVAL_DAYS,
  VOCAB_RECALL_STAGES,
} from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabRecallStage,
} from '@/modules/vocabulary/types'

const DAY_MS = 86_400_000

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function normalizeStage(stage: number | null | undefined): VocabRecallStage {
  return VOCAB_RECALL_STAGES.includes(stage as VocabRecallStage)
    ? (stage as VocabRecallStage)
    : 1
}

export function getInitialLearningState(now = new Date()) {
  return {
    correctCount: 0,
    dueAt: now,
    knownAt: null,
    knownReason: null,
    masteredAt: null,
    masteredReason: null,
    recallStage: 1 as const,
    reviewCount: 0,
    status: 'learning' as const,
    wrongCount: 0,
  }
}

export function getAlreadyKnownState(now = new Date()) {
  return {
    dueAt: null,
    knownAt: now,
    knownReason: 'manual' as const,
    masteredAt: null,
    masteredReason: null,
    recallStage: 1 as const,
    status: 'alreadyKnow' as const,
  }
}

export function applyRecallAnswer({
  item,
  isCorrect,
  now = new Date(),
}: {
  item: Pick<
    UserVocabItemApiRecord,
    'correctCount' | 'recallStage' | 'reviewCount' | 'wrongCount'
  >
  isCorrect: boolean
  now?: Date
}) {
  const reviewCount = item.reviewCount + 1

  if (!isCorrect)
    return {
      correctCount: item.correctCount,
      dueAt: now,
      lastReviewedAt: now,
      masteredAt: null,
      masteredReason: null,
      recallStage: 1 as const,
      reviewCount,
      status: 'learning' as const,
      wrongCount: item.wrongCount + 1,
    }

  const currentStage = normalizeStage(item.recallStage)

  if (currentStage >= 7)
    return {
      correctCount: item.correctCount + 1,
      dueAt: null,
      lastReviewedAt: now,
      masteredAt: now,
      masteredReason: 'recallMastery' as const,
      recallStage: 7 as const,
      reviewCount,
      status: 'mastered' as const,
      wrongCount: item.wrongCount,
    }

  const intervalStage =
    currentStage as keyof typeof VOCAB_RECALL_STAGE_INTERVAL_DAYS
  const nextStage = (currentStage + 1) as VocabRecallStage

  return {
    correctCount: item.correctCount + 1,
    dueAt: addDays(now, VOCAB_RECALL_STAGE_INTERVAL_DAYS[intervalStage]),
    lastReviewedAt: now,
    masteredAt: null,
    masteredReason: null,
    recallStage: nextStage,
    reviewCount,
    status: 'learning' as const,
    wrongCount: item.wrongCount,
  }
}
