import { describe, expect, test } from 'vitest'

import type {
  DictationAttemptApiRecord,
  DictationGlobalStatsRecord,
  DictationReviewItemApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import {
  ACTIVE_REVIEW_STATUSES,
  computeGlobalDictationStats,
  EMPTY_GLOBAL_STATS_SUMMARY,
  type GlobalStatsFacetResult,
  getGlobalStatsWindows,
  RECENT_TOKEN_ATTEMPT_LIMIT,
  toGlobalStatsSummary,
  toGlobalStatsTokenAttempt,
} from './globalStats'

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

// MARK: Legacy reference

// Frozen copy of aggregateGlobalDictationStats as it was before the service
// stopped loading the whole catalog and every attempt field. The parity test
// below holds the rewrite to this output.

type CompletedAttempt = Pick<
  DictationAttemptApiRecord,
  'action' | 'isPassed' | 'segmentId'
>

const LEGACY_ACTIVE_REVIEW_STATUSES = new Set(['due', 'scheduled'])
const DAY_MS = 86_400_000

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getStartOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function getDaysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS)
}

function isCompletedAttempt(attempt: CompletedAttempt) {
  return (
    attempt.isPassed || attempt.action === 'reveal' || attempt.action === 'skip'
  )
}

function getPercent(part: number, whole: number) {
  if (whole <= 0) return 0

  return Math.round((part / whole) * 100)
}

function getCompletedSegmentCount(attempts: DictationAttemptApiRecord[]) {
  return new Set(
    attempts.filter(isCompletedAttempt).map(attempt => attempt.segmentId)
  ).size
}

function getPracticeTimeSince({
  attempts,
  since,
}: {
  attempts: DictationAttemptApiRecord[]
  since: Date
}) {
  return attempts
    .filter(attempt => attempt.createdAt >= since)
    .reduce((total, attempt) => total + attempt.timeSpentMs, 0)
}

function getActiveStreakDays({
  attempts,
  now,
}: {
  attempts: DictationAttemptApiRecord[]
  now: Date
}) {
  const practiceDays = new Set(
    attempts.map(attempt => getDayKey(attempt.createdAt))
  )

  if (practiceDays.size === 0) return 0

  const latestPracticeDay = Array.from(practiceDays).sort().at(-1)
  let cursor = latestPracticeDay
    ? getStartOfUtcDay(new Date(`${latestPracticeDay}T00:00:00.000Z`))
    : getStartOfUtcDay(now)
  let streak = 0

  while (practiceDays.has(getDayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }

  return streak
}

function getWeakWords(attempts: DictationAttemptApiRecord[]) {
  const words = new Map<string, number>()

  for (const attempt of attempts)
    for (const token of attempt.feedbackTokens) {
      if (token.status === 'correct' || token.status === 'extra') continue

      const word = (token.expectedOriginal ?? token.expected ?? '')
        .toLowerCase()
        .trim()

      if (!word) continue

      words.set(word, (words.get(word) ?? 0) + 1)
    }

  return Array.from(words.entries())
    .map(([word, count]) => ({ count, word }))
    .sort(
      (left, right) =>
        right.count - left.count || left.word.localeCompare(right.word)
    )
    .slice(0, 10)
}

function getRepeatedMistakeTypes(attempts: DictationAttemptApiRecord[]) {
  const counts = {
    extra: 0,
    missing: 0,
    spellingVariant: 0,
    wrong: 0,
  }

  for (const attempt of attempts)
    for (const token of attempt.feedbackTokens) {
      if (token.status === 'correct') continue

      counts[token.status] += 1
    }

  return [
    {
      count: counts.missing,
      label: 'Missing words',
      type: 'missing' as const,
    },
    {
      count: counts.wrong,
      label: 'Wrong words',
      type: 'wrong' as const,
    },
    {
      count: counts.extra,
      label: 'Extra words',
      type: 'extra' as const,
    },
    {
      count: counts.spellingVariant,
      label: 'Spelling variants',
      type: 'spellingVariant' as const,
    },
  ].sort((left, right) => right.count - left.count)
}

function getFirstTryAccuracyTrend({
  attempts,
  now,
}: {
  attempts: DictationAttemptApiRecord[]
  now: Date
}) {
  const firstChecksBySegment = new Map<string, DictationAttemptApiRecord>()

  for (const attempt of attempts
    .filter(item => item.action === 'check')
    .sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
    ))
    if (!firstChecksBySegment.has(attempt.segmentId))
      firstChecksBySegment.set(attempt.segmentId, attempt)

  return Array.from({ length: 7 }, (_, index) => {
    const day = getStartOfUtcDay(new Date(now.getTime() - (6 - index) * DAY_MS))
    const nextDay = new Date(day.getTime() + DAY_MS)
    const dayAttempts = Array.from(firstChecksBySegment.values()).filter(
      attempt => attempt.createdAt >= day && attempt.createdAt < nextDay
    )
    const totals = dayAttempts.reduce(
      (currentTotals, attempt) => ({
        correct: currentTotals.correct + attempt.stats.correctCount,
        expected: currentTotals.expected + attempt.stats.totalExpected,
      }),
      {
        correct: 0,
        expected: 0,
      }
    )

    return {
      accuracy: getPercent(totals.correct, totals.expected),
      label: day.toISOString().slice(5, 10),
    }
  })
}

function legacyAggregateGlobalDictationStats({
  attempts,
  completedVideoIds,
  now = new Date(),
  userId,
  reviewItems,
  videos,
}: {
  attempts: DictationAttemptApiRecord[]
  // Ids of videos this user has completed at least one session on (per-user,
  // derived from sessions - not the shared video.status).
  completedVideoIds: Set<string>
  now?: Date
  userId: string
  reviewItems: DictationReviewItemApiRecord[]
  videos: DictationVideoApiRecord[]
}): DictationGlobalStatsRecord {
  // Content (videos) is global; practice data (attempts, review items,
  // completions) is per-user, so only those are filtered by the current user.
  const userAttempts = attempts.filter(attempt => attempt.userId === userId)
  const userReviewItems = reviewItems.filter(item => item.userId === userId)

  return {
    activeStreakDays: getActiveStreakDays({
      attempts: userAttempts,
      now,
    }),
    completedSegmentCount: getCompletedSegmentCount(userAttempts),
    completedVideoCount: videos.filter(video => completedVideoIds.has(video.id))
      .length,
    dueReviewItemCount: userReviewItems.filter(item =>
      LEGACY_ACTIVE_REVIEW_STATUSES.has(item.status)
    ).length,
    firstTryAccuracyTrend: getFirstTryAccuracyTrend({
      attempts: userAttempts,
      now,
    }),
    monthlyPracticeTimeMs: getPracticeTimeSince({
      attempts: userAttempts,
      since: getDaysAgo(now, 30),
    }),
    repeatedMistakeTypes: getRepeatedMistakeTypes(userAttempts),
    totalVideoCount: videos.length,
    weakWords: getWeakWords(userAttempts),
    weeklyPracticeTimeMs: getPracticeTimeSince({
      attempts: userAttempts,
      since: getDaysAgo(now, 7),
    }),
  }
}

// MARK: Rewrite path

// What the service does. The DB scopes rows to the user; buildGlobalStatsPipeline
// reduces them in MongoDB, emulated here stage by stage (same windows, same
// rules) so the JS side - toGlobalStatsSummary and computeGlobalDictationStats
// - is held to the legacy output. The token window is the newest
// RECENT_TOKEN_ATTEMPT_LIMIT attempts, projected to the token fields.
function runPipelineInMemory(
  attempts: DictationAttemptApiRecord[]
): GlobalStatsFacetResult {
  const { monthStart, trendStart, weekStart } = getGlobalStatsWindows(now)
  const completed = new Set(
    attempts
      .filter(
        attempt =>
          attempt.isPassed ||
          attempt.action === 'reveal' ||
          attempt.action === 'skip'
      )
      .map(attempt => attempt.segmentId)
  )
  const firstBySegment = new Map<string, DictationAttemptApiRecord>()

  for (const attempt of attempts.filter(item => item.action === 'check')) {
    const current = firstBySegment.get(attempt.segmentId)

    if (
      !current ||
      attempt.createdAt < current.createdAt ||
      (attempt.createdAt.getTime() === current.createdAt.getTime() &&
        attempt.id < current.id)
    )
      firstBySegment.set(attempt.segmentId, attempt)
  }

  const recent = attempts.filter(attempt => attempt.createdAt >= monthStart)

  return {
    completedSegments: completed.size ? [{ count: completed.size }] : [],
    firstChecks: [...firstBySegment.values()]
      .filter(attempt => attempt.createdAt >= trendStart)
      .map(attempt => ({
        correctCount: attempt.stats.correctCount,
        createdAt: attempt.createdAt,
        totalExpected: attempt.stats.totalExpected,
      })),
    practiceDays: [
      ...new Set(
        attempts.map(attempt => attempt.createdAt.toISOString().slice(0, 10))
      ),
    ].map(day => ({ _id: day })),
    practiceTime: recent.length
      ? [
          {
            monthly: recent.reduce(
              (total, attempt) => total + attempt.timeSpentMs,
              0
            ),
            weekly: recent
              .filter(attempt => attempt.createdAt >= weekStart)
              .reduce((total, attempt) => total + attempt.timeSpentMs, 0),
          },
        ]
      : [],
  }
}

function selectRecentTokenAttempts(attempts: DictationAttemptApiRecord[]) {
  return [...attempts]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, RECENT_TOKEN_ATTEMPT_LIMIT)
    .map(attempt =>
      toGlobalStatsTokenAttempt({
        feedbackTokens: attempt.feedbackTokens.map(token => ({
          expected: token.expected,
          expectedOriginal: token.expectedOriginal,
          status: token.status,
        })),
      })
    )
}

function computeLikeService({
  attempts,
  completedVideoIds,
  reviewItems,
  userId,
  videos,
}: {
  attempts: DictationAttemptApiRecord[]
  completedVideoIds: Set<string>
  reviewItems: DictationReviewItemApiRecord[]
  userId: string
  videos: DictationVideoApiRecord[]
}): DictationGlobalStatsRecord {
  const active = new Set<string>(ACTIVE_REVIEW_STATUSES)
  const videoIds = new Set(videos.map(video => video.id))
  const userAttempts = attempts.filter(attempt => attempt.userId === userId)

  return computeGlobalDictationStats({
    completedVideoCount: [...completedVideoIds].filter(id => videoIds.has(id))
      .length,
    dueReviewItemCount: reviewItems.filter(
      item => item.userId === userId && active.has(item.status)
    ).length,
    now,
    recentTokenAttempts: selectRecentTokenAttempts(userAttempts),
    // An empty $match still yields one $facet document, with empty arrays.
    summary: toGlobalStatsSummary(runPipelineInMemory(userAttempts)),
    totalVideoCount: videos.length,
  })
}

describe('computeGlobalDictationStats', () => {
  test('scopes attempts and review items per user while videos stay global', () => {
    const stats = computeLikeService({
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
    const stats = computeGlobalDictationStats({
      completedVideoCount: 0,
      dueReviewItemCount: 0,
      now,
      recentTokenAttempts: [],
      summary: EMPTY_GLOBAL_STATS_SUMMARY,
      totalVideoCount: 0,
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

    const stats = computeLikeService({
      attempts,
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

  test('defaults missing projected fields like toDictationAttemptRecord', () => {
    expect(toGlobalStatsTokenAttempt({})).toEqual({ feedbackTokens: [] })
    expect(
      toGlobalStatsTokenAttempt({ feedbackTokens: [{ status: 'missing' }] })
    ).toEqual({
      feedbackTokens: [
        { expected: null, expectedOriginal: null, status: 'missing' },
      ],
    })
  })

  test('reads a sparse or missing facet document as zeros', () => {
    expect(toGlobalStatsSummary(undefined)).toEqual(EMPTY_GLOBAL_STATS_SUMMARY)
    expect(
      toGlobalStatsSummary({
        firstChecks: [{ createdAt: now }],
        practiceDays: [{ _id: '2026-01-07' }, { _id: null }],
        practiceTime: [{ monthly: null, weekly: 5 }],
      })
    ).toEqual({
      completedSegmentCount: 0,
      firstChecks: [{ correctCount: 0, createdAt: now, totalExpected: 0 }],
      monthlyPracticeTimeMs: 0,
      practiceDayKeys: ['2026-01-07'],
      weeklyPracticeTimeMs: 5,
    })
  })
})

describe('global stats rewrite parity', () => {
  const statuses = ['correct', 'wrong', 'missing', 'extra', 'spellingVariant']
  const actions = ['check', 'check', 'reveal', 'skip'] as const
  const reviewStatuses = ['due', 'scheduled', 'completed', 'dismissed'] as const

  const attempts = Array.from({ length: 240 }, (_, index) =>
    makeAttempt({
      action: actions[index % actions.length],
      // Spread over 40 days, unsorted, so streaks, windows and the 7-day
      // first-try trend all have something to disagree about.
      createdAt: new Date(
        now.getTime() -
          ((index * 7) % 40) * 86_400_000 -
          (index % 5) * 3_600_000
      ),
      feedbackTokens: Array.from({ length: (index % 4) + 1 }, (_, token) => ({
        actual: token % 2 ? null : 'typed',
        actualOriginal: null,
        expected: `word-${(index + token) % 13}`,
        expectedOriginal: token % 3 ? `Word-${(index + token) % 13}` : null,
        status: statuses[(index + token) % statuses.length] as
          'correct' | 'wrong',
      })),
      id: `attempt-${index}`,
      isPassed: index % 4 === 1,
      segmentId: `segment-${index % 37}`,
      stats: {
        accuracy: index % 100,
        correctCount: index % 6,
        extraCount: 0,
        missingCount: 0,
        spellingVariantCount: 0,
        totalExpected: 6,
        wrongCount: 0,
      },
      timeSpentMs: (index % 9) * 11_000,
      userId: index % 5 === 0 ? 'other-user' : 'user-one',
    })
  )
  const reviewItems = Array.from({ length: 30 }, (_, index) =>
    makeReviewItem({
      id: `review-${index}`,
      status: reviewStatuses[index % reviewStatuses.length],
      userId: index % 6 === 0 ? 'other-user' : 'user-one',
    })
  )
  const videos = Array.from({ length: 12 }, (_, index) =>
    makeVideo({ id: `video-${index}` })
  )
  // One completed id points at a video that no longer exists.
  const completedVideoIds = new Set(['video-1', 'video-4', 'video-9', 'gone'])

  test('matches the legacy aggregation for a mixed fixture', () => {
    const legacy = legacyAggregateGlobalDictationStats({
      attempts,
      completedVideoIds,
      now,
      reviewItems,
      userId: 'user-one',
      videos,
    })

    expect(
      computeLikeService({
        attempts,
        completedVideoIds,
        reviewItems,
        userId: 'user-one',
        videos,
      })
    ).toEqual(legacy)
    expect(legacy.completedVideoCount).toBe(3)
    expect(legacy.weakWords.length).toBeGreaterThan(0)
  })

  test('keeps an all-time streak longer than the token window', () => {
    const days = RECENT_TOKEN_ATTEMPT_LIMIT + 100
    const longHistory = Array.from({ length: days }, (_, index) =>
      makeAttempt({
        createdAt: new Date(now.getTime() - index * 86_400_000),
        id: `streak-${index}`,
        segmentId: `segment-${index}`,
      })
    )
    const legacy = legacyAggregateGlobalDictationStats({
      attempts: longHistory,
      completedVideoIds: new Set(),
      now,
      reviewItems: [],
      userId: 'user-one',
      videos,
    })
    const stats = computeLikeService({
      attempts: longHistory,
      completedVideoIds: new Set(),
      reviewItems: [],
      userId: 'user-one',
      videos,
    })

    expect(stats.activeStreakDays).toBe(days)
    expect(stats.activeStreakDays).toBe(legacy.activeStreakDays)
    expect(stats.firstTryAccuracyTrend).toEqual(legacy.firstTryAccuracyTrend)
  })

  // Deliberate change from the legacy all-time totals: weak words and mistake
  // types read only the newest RECENT_TOKEN_ATTEMPT_LIMIT attempts.
  test('counts weak words and mistake types over the recent window only', () => {
    const tokenOf = (word: string, status: 'missing' | 'wrong') => ({
      actual: null,
      actualOriginal: null,
      expected: word,
      expectedOriginal: word,
      status,
    })
    const older = Array.from({ length: 50 }, (_, index) =>
      makeAttempt({
        createdAt: new Date(now.getTime() - (1_000 + index) * 60_000),
        feedbackTokens: [tokenOf('ancient', 'missing')],
        id: `old-${index}`,
      })
    )
    const newer = Array.from(
      { length: RECENT_TOKEN_ATTEMPT_LIMIT },
      (_, index) =>
        makeAttempt({
          createdAt: new Date(now.getTime() - index * 60_000),
          feedbackTokens: [tokenOf('recent', 'wrong')],
          id: `new-${index}`,
        })
    )
    const everyAttempt = [...older, ...newer]
    const input = {
      attempts: everyAttempt,
      completedVideoIds: new Set<string>(),
      reviewItems: [],
      userId: 'user-one',
      videos,
    }
    const legacy = legacyAggregateGlobalDictationStats({ ...input, now })
    const stats = computeLikeService(input)

    expect(stats.weakWords).toEqual([
      { count: RECENT_TOKEN_ATTEMPT_LIMIT, word: 'recent' },
    ])
    expect(stats.repeatedMistakeTypes).toContainEqual(
      expect.objectContaining({ count: 0, type: 'missing' })
    )
    expect(legacy.weakWords).toContainEqual({ count: 50, word: 'ancient' })
    // Everything else still covers the whole history.
    expect({
      ...stats,
      repeatedMistakeTypes: legacy.repeatedMistakeTypes,
      weakWords: legacy.weakWords,
    }).toEqual(legacy)
  })

  test('matches the legacy aggregation for a viewer with no data', () => {
    const legacy = legacyAggregateGlobalDictationStats({
      attempts,
      completedVideoIds: new Set(),
      now,
      reviewItems,
      userId: 'nobody',
      videos,
    })

    expect(
      computeLikeService({
        attempts,
        completedVideoIds: new Set(),
        reviewItems,
        userId: 'nobody',
        videos,
      })
    ).toEqual(legacy)
  })
})
