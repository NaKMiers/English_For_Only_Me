import { describe, expect, test } from 'vitest'

import { planVocabGuestMerge, type VocabMergeItem } from './planVocabGuestMerge'

function item(overrides: Partial<VocabMergeItem>): VocabMergeItem {
  return {
    correctCount: 0,
    firstSeenAt: new Date('2026-11-01T00:00:00Z'),
    id: 'item',
    lastReviewedAt: null,
    reviewCount: 0,
    vocabEntryId: 'entry',
    wrongCount: 0,
    ...overrides,
  }
}

describe('planVocabGuestMerge', () => {
  test('moves guest words the user does not have', () => {
    const plan = planVocabGuestMerge(
      [item({ id: 'g1', vocabEntryId: 'apple' })],
      [item({ id: 'u1', vocabEntryId: 'banana' })]
    )

    expect(plan).toEqual({ combine: [], move: ['g1'] })
  })

  test('keeps the user item for a shared word and folds the guest counts in', () => {
    const plan = planVocabGuestMerge(
      [
        item({
          correctCount: 2,
          firstSeenAt: new Date('2026-10-01T00:00:00Z'),
          id: 'g1',
          lastReviewedAt: new Date('2026-11-20T00:00:00Z'),
          reviewCount: 3,
          vocabEntryId: 'apple',
          wrongCount: 1,
        }),
      ],
      [
        item({
          correctCount: 5,
          firstSeenAt: new Date('2026-11-05T00:00:00Z'),
          id: 'u1',
          lastReviewedAt: new Date('2026-11-10T00:00:00Z'),
          reviewCount: 6,
          vocabEntryId: 'apple',
          wrongCount: 1,
        }),
      ]
    )

    expect(plan.move).toEqual([])
    expect(plan.combine).toEqual([
      {
        guestItemId: 'g1',
        update: {
          correctCount: 7,
          firstSeenAt: new Date('2026-10-01T00:00:00Z'),
          lastReviewedAt: new Date('2026-11-20T00:00:00Z'),
          reviewCount: 9,
          wrongCount: 2,
        },
        userItemId: 'u1',
      },
    ])
  })

  test('a word never reviewed on either side keeps no review date', () => {
    const plan = planVocabGuestMerge(
      [item({ id: 'g1', vocabEntryId: 'apple' })],
      [item({ id: 'u1', vocabEntryId: 'apple' })]
    )

    expect(plan.combine[0].update.lastReviewedAt).toBeNull()
  })

  test('an empty guest plans nothing', () => {
    expect(planVocabGuestMerge([], [item({ id: 'u1' })])).toEqual({
      combine: [],
      move: [],
    })
  })
})
