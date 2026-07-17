import type {
  DictationAttemptApiRecord,
  DictationGlobalStatsRecord,
  DictationReviewItemApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

type CompletedAttempt = Pick<
  DictationAttemptApiRecord,
  'action' | 'isPassed' | 'segmentId'
>

const ACTIVE_REVIEW_STATUSES = new Set(['due', 'scheduled'])
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

export function aggregateGlobalDictationStats({
  attempts,
  completedVideoIds,
  now = new Date(),
  userId,
  reviewItems,
  videos,
}: {
  attempts: DictationAttemptApiRecord[]
  // Ids of videos this user has completed at least one session on (per-user,
  // derived from sessions — not the shared video.status).
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
    completedVideoCount: videos.filter(video =>
      completedVideoIds.has(video.id)
    ).length,
    dueReviewItemCount: userReviewItems.filter(item =>
      ACTIVE_REVIEW_STATUSES.has(item.status)
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
