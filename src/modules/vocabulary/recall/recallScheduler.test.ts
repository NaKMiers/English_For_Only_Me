import { describe, expect, test } from 'vitest'

import type { UserVocabItemApiRecord } from '@/modules/vocabulary/types'

import {
  applyRecallAnswer,
  getAlreadyKnownState,
  getInitialLearningState,
} from './recallScheduler'

const now = new Date('2026-01-01T00:00:00.000Z')

function makeItem(
  overrides: Partial<UserVocabItemApiRecord> = {}
): UserVocabItemApiRecord {
  return {
    id: 'item',
    correctCount: 0,
    createdAt: now,
    dueAt: now,
    firstSeenAt: now,
    knownAt: null,
    knownReason: null,
    lastReviewedAt: null,
    masteredAt: null,
    masteredReason: null,
    notes: null,
    recallStage: 1,
    reviewCount: 0,
    source: 'manual',
    status: 'learning',
    updatedAt: now,
    userId: 'user',
    vocabEntryId: 'entry',
    wrongCount: 0,
    ...overrides,
  }
}

describe('vocab recall scheduler', () => {
  test('starts should-learn words at stage 1 due now', () => {
    expect(getInitialLearningState(now)).toMatchObject({
      dueAt: now,
      recallStage: 1,
      status: 'learning',
    })
  })

  test('keeps manual known separate from recall mastery', () => {
    expect(getAlreadyKnownState(now)).toMatchObject({
      dueAt: null,
      knownAt: now,
      knownReason: 'manual',
      masteredAt: null,
      status: 'alreadyKnow',
    })
  })

  test('advances correct answers through the day schedule', () => {
    const stage1 = applyRecallAnswer({
      isCorrect: true,
      item: makeItem({ recallStage: 1 }),
      now,
    })
    const stage3 = applyRecallAnswer({
      isCorrect: true,
      item: makeItem({ recallStage: 3 }),
      now,
    })

    expect(stage1).toMatchObject({
      recallStage: 2,
      status: 'learning',
    })
    expect(stage1.dueAt?.toISOString()).toBe('2026-01-02T00:00:00.000Z')
    expect(stage3).toMatchObject({
      recallStage: 4,
      status: 'learning',
    })
    expect(stage3.dueAt?.toISOString()).toBe('2026-01-05T00:00:00.000Z')
  })

  test('marks stage 7 correct as mastered', () => {
    expect(
      applyRecallAnswer({
        isCorrect: true,
        item: makeItem({ recallStage: 7 }),
        now,
      })
    ).toMatchObject({
      dueAt: null,
      masteredAt: now,
      masteredReason: 'recallMastery',
      recallStage: 7,
      status: 'mastered',
    })
  })

  test('resets any missed answer to stage 1 due now', () => {
    expect(
      applyRecallAnswer({
        isCorrect: false,
        item: makeItem({ recallStage: 5, wrongCount: 2 }),
        now,
      })
    ).toMatchObject({
      dueAt: now,
      recallStage: 1,
      status: 'learning',
      wrongCount: 3,
    })
  })
})
