import type {
  DictationCorrectionTokenRecord,
  DictationGlobalStatsRecord,
} from '@/modules/dictation/types'

/** Review statuses that count as "due" on the stats card. */
export const ACTIVE_REVIEW_STATUSES = ['due', 'scheduled'] as const

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

function getPercent(part: number, whole: number) {
  if (whole <= 0) return 0

  return Math.round((part / whole) * 100)
}

/**
 * How many of the user's most recent attempts feed the token-based parts
 * (weak words, mistake types). Everything else is counted over the user's
 * whole history inside MongoDB; these two need every feedback token, so they
 * are bounded to keep the cost flat however long someone has practised.
 * Semantics: "your weak spots lately", not all-time totals.
 */
export const RECENT_TOKEN_ATTEMPT_LIMIT = 500

/** The days the first-try trend shows, today included. */
const TREND_DAYS = 7

/** One token-bearing attempt from the capped recent window. */
export interface GlobalStatsTokenAttempt {
  feedbackTokens: Pick<
    DictationCorrectionTokenRecord,
    'expected' | 'expectedOriginal' | 'status'
  >[]
}

export const GLOBAL_STATS_TOKEN_PROJECTION = {
  _id: 0,
  'feedbackTokens.expected': 1,
  'feedbackTokens.expectedOriginal': 1,
  'feedbackTokens.status': 1,
} as const

/** Lean shape returned by a find() with GLOBAL_STATS_TOKEN_PROJECTION. */
export interface GlobalStatsTokenAttemptDocument {
  feedbackTokens?:
    | {
        expected?: string | null
        expectedOriginal?: string | null
        status: DictationCorrectionTokenRecord['status']
      }[]
    | null
}

/** Same defaults as toDictationAttemptRecord, for the projected fields only. */
export function toGlobalStatsTokenAttempt(
  attempt: GlobalStatsTokenAttemptDocument
): GlobalStatsTokenAttempt {
  return {
    feedbackTokens: (attempt.feedbackTokens ?? []).map(token => ({
      expected: token.expected ?? null,
      expectedOriginal: token.expectedOriginal ?? null,
      status: token.status,
    })),
  }
}

/** The first `check` of one segment (ever), when it falls in the trend. */
export interface GlobalStatsFirstCheck {
  correctCount: number
  createdAt: Date
  totalExpected: number
}

/**
 * Whole-history counts, computed by MongoDB (buildGlobalStatsPipeline) so the
 * server ships a few numbers instead of every attempt.
 */
export interface GlobalStatsSummary {
  completedSegmentCount: number
  // First checks of segments whose first check is inside the trend window.
  firstChecks: GlobalStatsFirstCheck[]
  monthlyPracticeTimeMs: number
  // Distinct UTC days (YYYY-MM-DD) with any attempt; one per day practised,
  // so it stays small and the streak can be any length.
  practiceDayKeys: string[]
  weeklyPracticeTimeMs: number
}

export const EMPTY_GLOBAL_STATS_SUMMARY: GlobalStatsSummary = {
  completedSegmentCount: 0,
  firstChecks: [],
  monthlyPracticeTimeMs: 0,
  practiceDayKeys: [],
  weeklyPracticeTimeMs: 0,
}

export function getGlobalStatsWindows(now: Date) {
  return {
    monthStart: getDaysAgo(now, 30),
    trendStart: getStartOfUtcDay(
      new Date(now.getTime() - (TREND_DAYS - 1) * DAY_MS)
    ),
    weekStart: getDaysAgo(now, 7),
  }
}

/**
 * One pass over the user's attempts (served by the userId indexes), split by
 * $facet. Mirrors the old in-memory rules exactly:
 * - completed segment: passed, revealed or skipped at least once
 * - practice time: rolling 7 and 30 days, summed timeSpentMs
 * - first try: each segment's earliest check (ties broken by _id), kept only
 *   when it falls in the trend window
 * - streak days: UTC calendar days, like toISOString().slice(0, 10)
 */
export function buildGlobalStatsPipeline({
  now,
  userId,
}: {
  now: Date
  userId: string
}) {
  const { monthStart, trendStart, weekStart } = getGlobalStatsWindows(now)

  return [
    { $match: { userId } },
    {
      $facet: {
        completedSegments: [
          {
            $match: {
              $or: [
                { isPassed: true },
                { action: { $in: ['reveal', 'skip'] } },
              ],
            },
          },
          { $group: { _id: '$segmentId' } },
          { $count: 'count' },
        ],
        firstChecks: [
          { $match: { action: 'check' } },
          {
            $group: {
              _id: '$segmentId',
              // Documents compare field by field, so this is the earliest
              // check, then the lowest _id, carrying its stats along.
              first: {
                $min: {
                  createdAt: '$createdAt',
                  id: '$_id',
                  correctCount: '$stats.correctCount',
                  totalExpected: '$stats.totalExpected',
                },
              },
            },
          },
          { $match: { 'first.createdAt': { $gte: trendStart } } },
          {
            $project: {
              _id: 0,
              correctCount: '$first.correctCount',
              createdAt: '$first.createdAt',
              totalExpected: '$first.totalExpected',
            },
          },
        ],
        practiceDays: [
          {
            $group: {
              _id: {
                $dateToString: {
                  date: '$createdAt',
                  format: '%Y-%m-%d',
                  timezone: 'UTC',
                },
              },
            },
          },
        ],
        practiceTime: [
          { $match: { createdAt: { $gte: monthStart } } },
          {
            $group: {
              _id: null,
              monthly: { $sum: '$timeSpentMs' },
              weekly: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', weekStart] },
                    '$timeSpentMs',
                    0,
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ]
}

/** Raw output document of buildGlobalStatsPipeline. */
export interface GlobalStatsFacetResult {
  completedSegments?: { count?: number | null }[]
  firstChecks?: {
    correctCount?: number | null
    createdAt: Date
    totalExpected?: number | null
  }[]
  practiceDays?: { _id: string | null }[]
  practiceTime?: { monthly?: number | null; weekly?: number | null }[]
}

export function toGlobalStatsSummary(
  result: GlobalStatsFacetResult | undefined
): GlobalStatsSummary {
  if (!result) return EMPTY_GLOBAL_STATS_SUMMARY

  const [practiceTime] = result.practiceTime ?? []

  return {
    completedSegmentCount: result.completedSegments?.[0]?.count ?? 0,
    firstChecks: (result.firstChecks ?? []).map(check => ({
      correctCount: check.correctCount ?? 0,
      createdAt: check.createdAt,
      totalExpected: check.totalExpected ?? 0,
    })),
    monthlyPracticeTimeMs: practiceTime?.monthly ?? 0,
    practiceDayKeys: (result.practiceDays ?? [])
      .map(day => day._id)
      .filter((day): day is string => Boolean(day)),
    weeklyPracticeTimeMs: practiceTime?.weekly ?? 0,
  }
}

function getActiveStreakDays(practiceDayKeys: string[]) {
  const practiceDays = new Set(practiceDayKeys)

  if (practiceDays.size === 0) return 0

  const latestPracticeDay = Array.from(practiceDays).sort().at(-1)
  let cursor = getStartOfUtcDay(new Date(`${latestPracticeDay}T00:00:00.000Z`))
  let streak = 0

  while (practiceDays.has(getDayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }

  return streak
}

function getWeakWords(attempts: GlobalStatsTokenAttempt[]) {
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

function getRepeatedMistakeTypes(attempts: GlobalStatsTokenAttempt[]) {
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
  firstChecks,
  now,
}: {
  firstChecks: GlobalStatsFirstCheck[]
  now: Date
}) {
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const day = getStartOfUtcDay(
      new Date(now.getTime() - (TREND_DAYS - 1 - index) * DAY_MS)
    )
    const nextDay = new Date(day.getTime() + DAY_MS)
    const totals = firstChecks
      .filter(check => check.createdAt >= day && check.createdAt < nextDay)
      .reduce(
        (currentTotals, check) => ({
          correct: currentTotals.correct + check.correctCount,
          expected: currentTotals.expected + check.totalExpected,
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

/**
 * Global dictation stats for one user. Every input is already scoped to that
 * user by the query: `summary` is the whole-history aggregation, and
 * `recentTokenAttempts` the newest RECENT_TOKEN_ATTEMPT_LIMIT attempts' tokens.
 * The video totals come from counts rather than the whole catalog.
 */
export function computeGlobalDictationStats({
  completedVideoCount,
  dueReviewItemCount,
  now = new Date(),
  recentTokenAttempts,
  summary,
  totalVideoCount,
}: {
  // Videos this user has completed at least one session on (per-user, derived
  // from sessions - not the shared video.status) that still exist.
  completedVideoCount: number
  dueReviewItemCount: number
  now?: Date
  recentTokenAttempts: GlobalStatsTokenAttempt[]
  summary: GlobalStatsSummary
  totalVideoCount: number
}): DictationGlobalStatsRecord {
  return {
    activeStreakDays: getActiveStreakDays(summary.practiceDayKeys),
    completedSegmentCount: summary.completedSegmentCount,
    completedVideoCount,
    dueReviewItemCount,
    firstTryAccuracyTrend: getFirstTryAccuracyTrend({
      firstChecks: summary.firstChecks,
      now,
    }),
    monthlyPracticeTimeMs: summary.monthlyPracticeTimeMs,
    repeatedMistakeTypes: getRepeatedMistakeTypes(recentTokenAttempts),
    totalVideoCount,
    weakWords: getWeakWords(recentTokenAttempts),
    weeklyPracticeTimeMs: summary.weeklyPracticeTimeMs,
  }
}
