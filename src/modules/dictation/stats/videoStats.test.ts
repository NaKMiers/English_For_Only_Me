import { describe, expect, test } from 'vitest'

import type {
  DictationAttemptApiRecord,
  DictationSegmentApiRecord,
} from '@/modules/dictation/types'

import { aggregateVideoStats } from './videoStats'

const now = new Date('2026-01-01T00:00:00.000Z')

function makeSegment(
  id: string,
  text: string,
  order: number
): DictationSegmentApiRecord {
  return {
    id,
    attemptCount: 0,
    attemptStatus: 'notStarted',
    createdAt: now,
    cueIndexes: [],
    endMs: null,
    lastAttemptAt: null,
    normalizedText: text.toLowerCase(),
    order,
    ownerId: 'owner',
    qualityFlags: [],
    startMs: null,
    text,
    transcriptId: 'transcript',
    transcriptSourceHash: 'hash',
    updatedAt: now,
    videoId: 'video',
    warningAccepted: false,
  }
}

function makeAttempt(
  overrides: Partial<DictationAttemptApiRecord>
): DictationAttemptApiRecord {
  return {
    id: `attempt-${overrides.segmentId ?? 'segment'}`,
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
    ownerId: 'owner',
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

describe('aggregateVideoStats', () => {
  test('aggregates per-video progress from attempt source of truth', () => {
    const segments = [
      makeSegment('segment-1', 'I want coffee.', 0),
      makeSegment('segment-2', 'Keep listening.', 1),
      makeSegment('segment-3', 'Final sentence.', 2),
    ]
    const attempts = [
      makeAttempt({
        id: 'first-wrong',
        replayCountDelta: 2,
      }),
      makeAttempt({
        id: 'first-correct',
        feedbackTokens: [
          {
            actual: 'coffee',
            actualOriginal: 'coffee',
            expected: 'coffee',
            expectedOriginal: 'coffee',
            status: 'correct',
          },
        ],
        isPassed: true,
        stats: {
          accuracy: 100,
          correctCount: 2,
          extraCount: 0,
          missingCount: 0,
          spellingVariantCount: 0,
          totalExpected: 2,
          wrongCount: 0,
        },
      }),
      makeAttempt({
        action: 'reveal',
        feedbackTokens: [
          {
            actual: null,
            actualOriginal: null,
            expected: 'keep',
            expectedOriginal: 'Keep',
            status: 'missing',
          },
          {
            actual: null,
            actualOriginal: null,
            expected: 'listening',
            expectedOriginal: 'listening',
            status: 'missing',
          },
        ],
        id: 'reveal',
        isPassed: false,
        segmentId: 'segment-2',
        stats: {
          accuracy: 0,
          correctCount: 0,
          extraCount: 0,
          missingCount: 2,
          spellingVariantCount: 0,
          totalExpected: 2,
          wrongCount: 0,
        },
        timeSpentMs: 2000,
      }),
    ]
    const stats = aggregateVideoStats({
      attempts,
      segments,
    })

    expect(stats.completionPercentage).toBe(67)
    expect(stats.completedSegmentCount).toBe(2)
    expect(stats.retryCount).toBe(1)
    expect(stats.replayCount).toBe(2)
    expect(stats.revealCount).toBe(1)
    expect(stats.skipCount).toBe(0)
    expect(stats.timeSpentMs).toBe(4000)
    expect(stats.firstTryWordAccuracy).toBe(50)
    expect(stats.overallWordAccuracy).toBe(75)
    expect(stats.mistakeTaxonomy.wrong).toBe(1)
    expect(stats.commonMissedWords[0]).toEqual({
      count: 1,
      word: 'coffee',
    })
    expect(stats.hardestSegments[0]?.segmentId).toBe('segment-2')
  })

  test('recomputes empty stats from no attempts', () => {
    const stats = aggregateVideoStats({
      attempts: [],
      segments: [makeSegment('segment-1', 'Empty state.', 0)],
    })

    expect(stats.completionPercentage).toBe(0)
    expect(stats.firstTryWordAccuracy).toBe(0)
    expect(stats.commonMissedWords).toEqual([])
  })
})
