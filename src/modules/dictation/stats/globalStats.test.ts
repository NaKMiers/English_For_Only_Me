import { describe, expect, test } from 'vitest'

import type {
  DictationAttemptApiRecord,
  DictationReviewItemApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import { aggregateGlobalDictationStats } from './globalStats'

const now = new Date('2026-01-07T12:00:00.000Z')

function makeVideo(
  overrides: Partial<DictationVideoApiRecord> = {}
): DictationVideoApiRecord {
  return {
    activeTranscriptId: null,
    channelTitle: null,
    collections: [],
    topicId: null,
    sectionId: null,
    level: null,
    createdAt: now,
    defaultLanguage: 'en',
    durationSeconds: null,
    id: 'video-one',
    importStatus: 'metadataReady',
    importWarning: null,
    order: 0,
    purpose: 'ielts-listening',
    sentenceCount: 0,
    sourceType: 'youtube',
    sourceUrl: null,
    status: 'ready',
    tags: [],
    thumbnailUrl: null,
    title: 'Listening video',
    transcriptStatus: 'manualNeeded',
    updatedAt: now,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeVideoId: 'dQw4w9WgXcQ',
    ...overrides,
  }
}

function makeAttempt(
  overrides: Partial<DictationAttemptApiRecord> = {}
): DictationAttemptApiRecord {
  return {
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
    id: 'attempt-one',
    idempotencyKey: 'key-one',
    isPassed: false,
    userId: 'user-one',
    replayCountDelta: 1,
    segmentId: 'segment-one',
    sessionId: 'session-one',
    stats: {
      accuracy: 50,
      correctCount: 1,
      extraCount: 0,
      missingCount: 0,
      spellingVariantCount: 0,
      totalExpected: 2,
      wrongCount: 1,
    },
    timeSpentMs: 60_000,
    transcriptId: 'transcript-one',
    typedAnswer: 'I want tea',
    updatedAt: now,
    videoId: 'video-one',
    ...overrides,
  }
}

function makeReviewItem(
  overrides: Partial<DictationReviewItemApiRecord> = {}
): DictationReviewItemApiRecord {
  return {
    createdAt: now,
    dueAt: now,
    id: 'review-one',
    kind: 'segment',
    label: 'I want coffee.',
    lastReviewedAt: null,
    userId: 'user-one',
    priority: 80,
    reason: 'lowAccuracy',
    segmentId: 'segment-one',
    statsSnapshot: {
      accuracy: 50,
      attemptCount: 1,
      lastAction: 'check',
      mistakeTaxonomy: {
        extra: 0,
        missing: 0,
        spellingVariant: 0,
        wrong: 1,
      },
    },
    status: 'due',
    updatedAt: now,
    videoId: 'video-one',
    ...overrides,
  }
}

describe('aggregateGlobalDictationStats', () => {
  test('scopes attempts and review items per user while videos stay global', () => {
    const stats = aggregateGlobalDictationStats({
      attempts: [
        makeAttempt({
          isPassed: true,
        }),
        makeAttempt({
          id: 'other-attempt',
          userId: 'other-user',
          segmentId: 'other-segment',
          timeSpentMs: 600_000,
        }),
      ],
      now,
      userId: 'user-one',
      reviewItems: [
        makeReviewItem(),
        makeReviewItem({
          id: 'other-review',
          userId: 'other-user',
        }),
      ],
      completedVideoIds: new Set(['video-one', 'other-video']),
      videos: [
        makeVideo(),
        makeVideo({
          id: 'other-video',
        }),
      ],
    })

    // completedVideoCount is per-user now: both videos this user completed.
    expect(stats.completedVideoCount).toBe(2)
    // Practice data stays per-user: the other user's attempts/reviews drop out.
    expect(stats.completedSegmentCount).toBe(1)
    expect(stats.dueReviewItemCount).toBe(1)
    expect(stats.weeklyPracticeTimeMs).toBe(60_000)
    expect(stats.weakWords).toEqual([
      {
        count: 1,
        word: 'coffee',
      },
    ])
  })

  test('returns a quiet empty state', () => {
    const stats = aggregateGlobalDictationStats({
      attempts: [],
      completedVideoIds: new Set(),
      now,
      userId: 'user-one',
      reviewItems: [],
      videos: [],
    })

    expect(stats.completedVideoCount).toBe(0)
    expect(stats.completedSegmentCount).toBe(0)
    expect(stats.firstTryAccuracyTrend).toHaveLength(7)
    expect(stats.repeatedMistakeTypes.every(item => item.count === 0)).toBe(
      true
    )
  })

  test('aggregates a larger dataset without losing completed segments', () => {
    const attempts = Array.from({ length: 180 }, (_, index) =>
      makeAttempt({
        createdAt: new Date(now.getTime() - (index % 20) * 86_400_000),
        id: `attempt-${index}`,
        isPassed: index % 3 === 0,
        segmentId: `segment-${index}`,
      })
    )

    const stats = aggregateGlobalDictationStats({
      attempts,
      now,
      userId: 'user-one',
      reviewItems: [],
      completedVideoIds: new Set(['video-complete']),
      videos: [
        makeVideo({
          id: 'video-complete',
        }),
      ],
    })

    expect(stats.completedSegmentCount).toBe(60)
    expect(stats.completedVideoCount).toBe(1)
    expect(stats.weakWords[0]).toEqual({
      count: 180,
      word: 'coffee',
    })
  })
})
