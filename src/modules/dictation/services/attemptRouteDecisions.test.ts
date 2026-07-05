import { describe, expect, test } from 'vitest'

import type { DictationAttemptApiRecord } from '@/modules/dictation/types'

import {
  getAttemptSegmentStatus,
  getCheckSegmentStatus,
  parseAttemptPayload,
  resolveAttemptSubmissionMode,
  shouldAdvanceAttemptCursor,
} from './attemptRouteDecisions'

const objectId = '0123456789abcdef01234567'

function makeAttempt(): DictationAttemptApiRecord {
  return {
    id: objectId,
    action: 'check',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expectedTextSnapshot: 'Hello world.',
    feedbackTokens: [],
    idempotencyKey: 'same-submit-key',
    isPassed: true,
    ownerId: 'owner',
    replayCountDelta: 0,
    segmentId: objectId,
    sessionId: objectId,
    stats: {
      accuracy: 100,
      correctCount: 2,
      extraCount: 0,
      missingCount: 0,
      spellingVariantCount: 0,
      totalExpected: 2,
      wrongCount: 0,
    },
    transcriptId: objectId,
    typedAnswer: 'hello world',
    timeSpentMs: 0,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    videoId: objectId,
  }
}

describe('attempt route decisions', () => {
  test('validates attempt payloads before database work', () => {
    expect(
      parseAttemptPayload({
        action: 'check',
        idempotencyKey: 'submit-123',
        segmentId: objectId,
        typedAnswer: 'hello world',
      }).ok
    ).toBe(true)
    expect(
      parseAttemptPayload({
        action: 'check',
        idempotencyKey: 'short',
        ownerId: 'client-owner',
        segmentId: 'bad',
      }).ok
    ).toBe(false)
  })

  test('resolves repeated submit idempotency without creating a second attempt', () => {
    const existingAttempt = makeAttempt()

    expect(resolveAttemptSubmissionMode(existingAttempt)).toEqual({
      attempt: existingAttempt,
      mode: 'idempotent',
    })
    expect(resolveAttemptSubmissionMode(null)).toEqual({
      attempt: null,
      mode: 'create',
    })
  })

  test('separates reveal and skip statuses from check outcomes', () => {
    expect(getAttemptSegmentStatus('reveal')).toBe('revealed')
    expect(getAttemptSegmentStatus('skip')).toBe('skipped')
    expect(getAttemptSegmentStatus('check')).toBeNull()
    expect(getCheckSegmentStatus(true)).toBe('correct')
    expect(getCheckSegmentStatus(false)).toBe('attemptedIncorrect')
  })

  test('advances only passed checks and skips', () => {
    expect(
      shouldAdvanceAttemptCursor({
        action: 'check',
        isPassed: true,
      })
    ).toBe(true)
    expect(
      shouldAdvanceAttemptCursor({
        action: 'check',
        isPassed: false,
      })
    ).toBe(false)
    expect(
      shouldAdvanceAttemptCursor({
        action: 'reveal',
        isPassed: false,
      })
    ).toBe(false)
    expect(
      shouldAdvanceAttemptCursor({
        action: 'skip',
        isPassed: false,
      })
    ).toBe(true)
  })
})
