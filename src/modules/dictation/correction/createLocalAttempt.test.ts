import { describe, expect, it } from 'vitest'

import { buildDictationCorrection } from './compareAnswer'
import { createLocalDictationAttempt } from './createLocalAttempt'

const BASE_INPUT = {
  expectedText: 'Being able to remember',
  idempotencyKey: 'key-123',
  userId: 'owner-1',
  replayCountDelta: 2,
  segmentId: 'segment-1',
  sessionId: 'session-1',
  timeSpentMs: 4200,
  transcriptId: 'transcript-1',
  videoId: 'video-1',
}

describe('createLocalDictationAttempt', () => {
  it('mirrors the correction result for a passing check', () => {
    const correction = buildDictationCorrection({
      action: 'check',
      expectedText: BASE_INPUT.expectedText,
      typedAnswer: 'Being able to remember',
    })
    const attempt = createLocalDictationAttempt({
      ...BASE_INPUT,
      correction,
      typedAnswer: 'Being able to remember',
    })

    expect(attempt.id).toBe('local-key-123')
    expect(attempt.action).toBe('check')
    expect(attempt.isPassed).toBe(true)
    expect(attempt.feedbackTokens).toBe(correction.feedbackTokens)
    expect(attempt.stats).toBe(correction.stats)
    expect(attempt.expectedTextSnapshot).toBe(BASE_INPUT.expectedText)
    expect(attempt.replayCountDelta).toBe(2)
    expect(attempt.timeSpentMs).toBe(4200)
    expect(attempt.createdAt).toBeInstanceOf(Date)
  })

  it('carries a failing correction verbatim', () => {
    const correction = buildDictationCorrection({
      action: 'check',
      expectedText: BASE_INPUT.expectedText,
      typedAnswer: 'Being able to',
    })
    const attempt = createLocalDictationAttempt({
      ...BASE_INPUT,
      correction,
      typedAnswer: 'Being able to',
    })

    expect(attempt.isPassed).toBe(false)
    expect(attempt.stats.accuracy).toBe(correction.stats.accuracy)
    expect(attempt.typedAnswer).toBe('Being able to')
  })
})
