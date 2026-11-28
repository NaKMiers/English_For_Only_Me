import { describe, expect, test } from 'vitest'

import type {
  DictationAttemptApiRecord,
  DictationSegmentApiRecord,
} from '@/modules/dictation/types'

import { buildReviewCandidates } from './reviewScheduler'

const now = new Date('2026-01-01T00:00:00.000Z')

function makeSegment(): DictationSegmentApiRecord {
  return {
    id: 'segment-1',
    attemptCount: 0,
    attemptStatus: 'notStarted',
    createdAt: now,
    cueIndexes: [],
    hints: [],
    hintsOverridden: false,
    endMs: null,
    lastAttemptAt: null,
    normalizedText: 'i want coffee',
    order: 0,
    qualityFlags: [],
    startMs: null,
    text: 'I want coffee.',
    transcriptId: 'transcript',
    transcriptSourceHash: 'hash',
    updatedAt: now,
    videoId: 'video',
    warningAccepted: false,
  }
}

function makeAttempt(
  overrides: Partial<DictationAttemptApiRecord> = {}
): DictationAttemptApiRecord {
  return {
    id: 'attempt',
    action: 'check',
    createdAt: now,
    expectedTextSnapshot: 'I want coffee.',
    feedbackTokens: [
      {
        actual: 'tea',
        actualOriginal: 'tea',
        expected: 'coffee',
        expectedOriginal: 'coffee',
        status: 'wrong',
      },
    ],
    idempotencyKey: 'key',
    isPassed: false,
    userId: 'owner',
    replayCountDelta: 0,
    segmentId: 'segment-1',
    sessionId: 'session',
    stats: {
      accuracy: 50,
      correctCount: 1,
      extraCount: 0,
      missingCount: 0,
      spellingVariantCount: 0,
      totalExpected: 2,
      wrongCount: 1,
    },
    timeSpentMs: 1000,
    transcriptId: 'transcript',
    typedAnswer: 'I want tea',
    updatedAt: now,
    videoId: 'video',
    ...overrides,
  }
}

describe('review scheduler', () => {
  test('creates review candidates for skipped, revealed, retry, repeated mistake, and low accuracy', () => {
    const candidates = buildReviewCandidates({
      attempts: [
        makeAttempt({ id: 'wrong-1' }),
        makeAttempt({ id: 'wrong-2' }),
        makeAttempt({ id: 'wrong-3' }),
        makeAttempt({ action: 'reveal', id: 'reveal' }),
        makeAttempt({ action: 'skip', id: 'skip' }),
      ],
      dueAt: now,
      segments: [makeSegment()],
    })

    expect(candidates.map(candidate => candidate.reason).sort()).toEqual([
      'highRetry',
      'lowAccuracy',
      'repeatedMistake',
      'revealed',
      'skipped',
    ])
  })
})
