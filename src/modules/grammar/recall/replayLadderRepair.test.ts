import { describe, expect, it } from 'vitest'

import { getReplayLadderRepair } from './replayLadderRepair'

const AT = new Date('2026-10-01T00:00:00.000Z')

function item(recallStage: number, lastReviewedAt: Date | null = null) {
  return {
    correctCount: 2,
    lastReviewedAt,
    recallStage,
    reviewCount: 4,
    wrongCount: 1,
  }
}

describe('getReplayLadderRepair', () => {
  it('owes the ladder move while the item still sits on stageBefore', () => {
    const repair = getReplayLadderRepair({
      attempt: { at: AT, stageBefore: 2, verdict: 'correct' },
      difficulty: 'medium',
      item: item(2, new Date('2026-09-20T00:00:00.000Z')),
    })

    expect(repair).toMatchObject({
      correctCount: 3,
      lastReviewedAt: AT,
      recallStage: 3,
      reviewCount: 5,
    })
  })

  it('owes nothing once the item moved past the attempt', () => {
    expect(
      getReplayLadderRepair({
        attempt: { at: AT, stageBefore: 2, verdict: 'correct' },
        difficulty: 'medium',
        item: item(3, AT),
      })
    ).toBeNull()
  })

  it('owes nothing when a later review moved the item away and back', () => {
    expect(
      getReplayLadderRepair({
        attempt: { at: AT, stageBefore: 2, verdict: 'correct' },
        difficulty: 'medium',
        item: item(2, new Date(AT.getTime() + 60_000)),
      })
    ).toBeNull()
  })

  it('owes nothing for a same-stage answer that already landed', () => {
    // Wrong at stage 1 stays on stage 1; the review time tells it landed.
    expect(
      getReplayLadderRepair({
        attempt: { at: AT, stageBefore: 1, verdict: 'wrong' },
        difficulty: 'medium',
        item: item(1, AT),
      })
    ).toBeNull()
  })

  it('creates the first rung when the first answer never created the item', () => {
    expect(
      getReplayLadderRepair({
        attempt: { at: AT, stageBefore: 1, verdict: 'wrong' },
        difficulty: 'medium',
        item: null,
      })
    ).toMatchObject({ recallStage: 1, reviewCount: 1, wrongCount: 1 })
  })

  it('leaves test and diagnostic attempts alone', () => {
    expect(
      getReplayLadderRepair({
        attempt: { at: AT, origin: 'test', stageBefore: 2, verdict: 'wrong' },
        difficulty: 'medium',
        item: item(2),
      })
    ).toBeNull()
  })
})
