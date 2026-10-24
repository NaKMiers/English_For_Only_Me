import { describe, expect, it } from 'vitest'

import type { UserGrammarItemApiRecord } from '@/modules/grammar/types'

import { buildLearnerPresentationState } from './grammarPresentationService'

const item: UserGrammarItemApiRecord = {
  correctCount: 4,
  dueAt: null,
  lastReviewedAt: '2026-10-20T00:00:00.000Z',
  masteredAt: null,
  pointSlug: 'articles',
  recallStage: 3,
  reviewCount: 6,
  status: 'learning',
  wrongCount: 2,
}

describe('buildLearnerPresentationState', () => {
  it('gives a signed-out visitor the quiet base state', () => {
    expect(
      buildLearnerPresentationState({
        actorId: null,
        history: null,
        item: null,
      })
    ).toEqual({
      actorId: null,
      correctAnswerStreak: 0,
      correctCount: 0,
      lastReviewedAt: null,
      recallStage: null,
      recentOutcome: null,
      reviewCount: 0,
      revivalCount: 0,
      scar: null,
      status: null,
      wrongCount: 0,
    })
  })

  it('merges the item row with the history reads', () => {
    const scar = { revivals: 2 } as never

    expect(
      buildLearnerPresentationState({
        actorId: 'guest_1',
        history: { correctAnswerStreak: 5, latestVerdict: 'wrong', scar },
        item,
      })
    ).toMatchObject({
      actorId: 'guest_1',
      correctAnswerStreak: 5,
      correctCount: 4,
      recallStage: 3,
      recentOutcome: 'wrong',
      revivalCount: 2,
      scar,
      status: 'learning',
      wrongCount: 2,
    })
  })
})
