import { describe, expect, it } from 'vitest'

import {
  applyRecallAnswer,
  getAlreadyKnownState,
  getInitialRecallState,
  getRecallIntervalDays,
  normalizeRecallStage,
  RECALL_STAGE_INTERVAL_DAYS,
} from './recallLadder'

const NOW = new Date('2026-08-20T00:00:00.000Z')
const DAY_MS = 86_400_000

function counters(
  overrides: Partial<Parameters<typeof applyRecallAnswer>[0]['item']> = {}
) {
  return {
    correctCount: 0,
    recallStage: 1,
    reviewCount: 0,
    wrongCount: 0,
    ...overrides,
  }
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

describe('normalizeRecallStage', () => {
  it('clamps anything outside 1-7 to stage 1', () => {
    expect(normalizeRecallStage(0)).toBe(1)
    expect(normalizeRecallStage(8)).toBe(1)
    expect(normalizeRecallStage(null)).toBe(1)
    expect(normalizeRecallStage(undefined)).toBe(1)
    expect(normalizeRecallStage(4)).toBe(4)
  })
})

describe('getRecallIntervalDays', () => {
  // medium must scale by exactly 1 - this is what makes adopting the shared
  // ladder behaviour-preserving for vocabulary.
  it('leaves medium difficulty identical to the raw table', () => {
    for (const stage of [1, 2, 3, 4, 5, 6] as const)
      expect(getRecallIntervalDays({ difficulty: 'medium', stage })).toBe(
        RECALL_STAGE_INTERVAL_DAYS[stage]
      )
  })

  it('defaults to medium when no difficulty is given', () => {
    for (const stage of [1, 2, 3, 4, 5, 6] as const)
      expect(getRecallIntervalDays({ stage })).toBe(
        RECALL_STAGE_INTERVAL_DAYS[stage]
      )
  })

  it('brings hard items back sooner and easy items back later', () => {
    for (const stage of [3, 4, 5, 6] as const) {
      const high = getRecallIntervalDays({ difficulty: 'high', stage }) ?? 0
      const medium = getRecallIntervalDays({ difficulty: 'medium', stage }) ?? 0
      const low = getRecallIntervalDays({ difficulty: 'low', stage }) ?? 0

      expect(high).toBeLessThan(medium)
      expect(low).toBeGreaterThan(medium)
    }
  })

  it('never schedules sooner than tomorrow', () => {
    // Stage 1 and 2 are already 1 day, so scaling down must not reach zero.
    expect(getRecallIntervalDays({ difficulty: 'high', stage: 1 })).toBe(1)
    expect(getRecallIntervalDays({ difficulty: 'high', stage: 2 })).toBe(1)
  })

  it('returns null at the mastery stage', () => {
    expect(getRecallIntervalDays({ stage: 7 })).toBeNull()
  })
})

describe('getInitialRecallState', () => {
  it('starts at stage 1, due immediately, with zeroed counters', () => {
    const state = getInitialRecallState(NOW)

    expect(state.recallStage).toBe(1)
    expect(state.dueAt).toBe(NOW)
    expect(state.status).toBe('learning')
    expect(state.correctCount).toBe(0)
    expect(state.wrongCount).toBe(0)
    expect(state.masteredAt).toBeNull()
  })
})

describe('getAlreadyKnownState', () => {
  it('stops scheduling and records the manual reason', () => {
    const state = getAlreadyKnownState(NOW)

    expect(state.status).toBe('alreadyKnow')
    expect(state.dueAt).toBeNull()
    expect(state.knownAt).toBe(NOW)
    expect(state.knownReason).toBe('manual')
  })
})

describe('applyRecallAnswer', () => {
  it('advances one stage and schedules the stage interval on a correct answer', () => {
    const patch = applyRecallAnswer({
      isCorrect: true,
      item: counters({ recallStage: 3 }),
      now: NOW,
    })

    expect(patch.recallStage).toBe(4)
    expect(patch.correctCount).toBe(1)
    expect(patch.reviewCount).toBe(1)
    expect(patch.status).toBe('learning')
    expect(daysBetween(NOW, patch.dueAt as Date)).toBe(
      RECALL_STAGE_INTERVAL_DAYS[3]
    )
  })

  it('resets to stage 1 and is due immediately on a wrong answer', () => {
    const patch = applyRecallAnswer({
      isCorrect: false,
      item: counters({ correctCount: 5, recallStage: 6, reviewCount: 9 }),
      now: NOW,
    })

    expect(patch.recallStage).toBe(1)
    expect(patch.dueAt).toBe(NOW)
    expect(patch.wrongCount).toBe(1)
    expect(patch.correctCount).toBe(5)
    expect(patch.reviewCount).toBe(10)
    expect(patch.status).toBe('learning')
    expect(patch.masteredAt).toBeNull()
  })

  it('masters the item on a correct answer at stage 7', () => {
    const patch = applyRecallAnswer({
      isCorrect: true,
      item: counters({ recallStage: 7 }),
      now: NOW,
    })

    expect(patch.status).toBe('mastered')
    expect(patch.dueAt).toBeNull()
    expect(patch.masteredAt).toBe(NOW)
    expect(patch.masteredReason).toBe('recallMastery')
    expect(patch.recallStage).toBe(7)
  })

  it('un-masters a mastered item that is answered wrong', () => {
    const patch = applyRecallAnswer({
      isCorrect: false,
      item: counters({ recallStage: 7 }),
      now: NOW,
    })

    expect(patch.status).toBe('learning')
    expect(patch.masteredAt).toBeNull()
    expect(patch.recallStage).toBe(1)
  })

  it('schedules a high-difficulty item sooner than a low-difficulty one', () => {
    const item = counters({ recallStage: 5 })
    const high = applyRecallAnswer({
      difficulty: 'high',
      isCorrect: true,
      item,
      now: NOW,
    })
    const low = applyRecallAnswer({
      difficulty: 'low',
      isCorrect: true,
      item,
      now: NOW,
    })

    expect((high.dueAt as Date).getTime()).toBeLessThan(
      (low.dueAt as Date).getTime()
    )
  })

  it('takes 7 correct answers to master from scratch', () => {
    let item = counters()
    let stages = 0

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const patch = applyRecallAnswer({ isCorrect: true, item, now: NOW })

      stages += 1
      item = {
        correctCount: patch.correctCount,
        recallStage: patch.recallStage,
        reviewCount: patch.reviewCount,
        wrongCount: patch.wrongCount,
      }

      if (patch.status === 'mastered') break
    }

    expect(stages).toBe(7)
    expect(item.recallStage).toBe(7)
  })

  it('sums to 44 days across the ladder at medium difficulty', () => {
    // The documented span. Guards against an interval edit changing the
    // schedule silently.
    const total = ([1, 2, 3, 4, 5, 6] as const).reduce(
      (sum, stage) => sum + RECALL_STAGE_INTERVAL_DAYS[stage],
      0
    )

    expect(total).toBe(44)
  })
})
