import { describe, expect, test } from 'vitest'

import type { DictationAttemptApiRecord } from '@/modules/dictation/types'

import { hasCompletedSegmentEffort } from './translationGate'

const now = new Date('2026-01-01T00:00:00.000Z')

function makeAttempt(
  overrides: Partial<DictationAttemptApiRecord>
): DictationAttemptApiRecord {
  return {
    action: 'check',
    createdAt: now,
    expectedTextSnapshot: 'Keep going.',
    feedbackTokens: [],
    id: 'attempt',
    idempotencyKey: 'key',
    isPassed: false,
    ownerId: 'owner',
    replayCountDelta: 0,
    segmentId: 'segment',
    sessionId: 'session',
    stats: {
      accuracy: 0,
      correctCount: 0,
      extraCount: 0,
      missingCount: 0,
      spellingVariantCount: 0,
      totalExpected: 0,
      wrongCount: 0,
    },
    timeSpentMs: 1000,
    transcriptId: 'transcript',
    typedAnswer: '',
    updatedAt: now,
    videoId: 'video',
    ...overrides,
  }
}

describe('hasCompletedSegmentEffort', () => {
  test('keeps translation locked while the learner is still trying', () => {
    expect(
      hasCompletedSegmentEffort([
        makeAttempt({
          action: 'check',
          isPassed: false,
        }),
      ])
    ).toBe(false)
  })

  test('unlocks translation after correct, reveal, or skip', () => {
    expect(
      hasCompletedSegmentEffort([
        makeAttempt({
          isPassed: true,
        }),
      ])
    ).toBe(true)
    expect(
      hasCompletedSegmentEffort([
        makeAttempt({
          action: 'reveal',
        }),
      ])
    ).toBe(true)
    expect(
      hasCompletedSegmentEffort([
        makeAttempt({
          action: 'skip',
        }),
      ])
    ).toBe(true)
  })
})
