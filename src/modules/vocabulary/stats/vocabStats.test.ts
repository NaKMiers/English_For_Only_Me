import { describe, expect, test } from 'vitest'

import type { UserVocabItemApiRecord } from '@/modules/vocabulary/types'

import { aggregateVocabStats } from './vocabStats'

const now = new Date('2026-01-10T00:00:00.000Z')

function makeItem(
  status: UserVocabItemApiRecord['status'],
  overrides: Partial<UserVocabItemApiRecord> = {}
): UserVocabItemApiRecord {
  return {
    id: `${status}-item`,
    correctCount: 0,
    createdAt: now,
    dueAt: null,
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
    status,
    updatedAt: now,
    userId: 'user',
    vocabEntryId: 'entry',
    wrongCount: 0,
    ...overrides,
  }
}

describe('vocab stats', () => {
  test('counts learning, known, mastered, due, and growth', () => {
    const stats = aggregateVocabStats({
      items: [
        makeItem('learning', { dueAt: now }),
        makeItem('alreadyKnow'),
        makeItem('mastered'),
      ],
      now,
      trendDays: 2,
    })

    expect(stats).toMatchObject({
      alreadyKnowCount: 1,
      dueTodayCount: 1,
      learningCount: 1,
      masteredCount: 1,
      totalKnownCount: 2,
      totalStartedCount: 3,
    })
    expect(stats.dailyGrowth.at(-1)).toEqual({
      count: 3,
      label: '01-10',
    })
  })

  test('summarizes accuracy, streaks, and hardest words', () => {
    const stats = aggregateVocabStats({
      items: [
        makeItem('learning', {
          correctCount: 3,
          lastReviewedAt: now,
          reviewCount: 5,
          vocabEntryId: 'hard-entry',
          wrongCount: 2,
        }),
        makeItem('learning', {
          correctCount: 1,
          lastReviewedAt: new Date('2026-01-09T12:00:00.000Z'),
          reviewCount: 4,
          vocabEntryId: 'harder-entry',
          wrongCount: 3,
        }),
      ],
      now,
      trendDays: 2,
    })

    expect(stats).toMatchObject({
      accuracyPercent: 44,
      activeStreakDays: 2,
      reviewsTodayCount: 1,
    })
    expect(stats.hardestWords[0]).toMatchObject({
      term: 'harder-entry',
      vocabEntryId: 'harder-entry',
      wrongCount: 3,
    })
  })
})
