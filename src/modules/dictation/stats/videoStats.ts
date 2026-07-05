import type {
  DictationAttemptApiRecord,
  DictationCorrectionTokenStatus,
  DictationSegmentApiRecord,
  DictationVideoStatsRecord,
} from '@/modules/dictation/types'

const MISTAKE_STATUSES: Exclude<DictationCorrectionTokenStatus, 'correct'>[] = [
  'extra',
  'missing',
  'spellingVariant',
  'wrong',
]
const mistakeStatusSet = new Set<DictationCorrectionTokenStatus>(
  MISTAKE_STATUSES
)

function isMistakeStatus(
  status: DictationCorrectionTokenStatus
): status is Exclude<DictationCorrectionTokenStatus, 'correct'> {
  return mistakeStatusSet.has(status)
}

function getPercent(part: number, whole: number) {
  if (whole <= 0) return 0

  return Math.round((part / whole) * 100)
}

function getSegmentLabel(segment: DictationSegmentApiRecord | undefined) {
  if (!segment) return 'Unknown segment'

  return segment.text.length > 96
    ? `${segment.text.slice(0, 96).trim()}...`
    : segment.text
}

function getAccuracyFromAttempts(attempts: DictationAttemptApiRecord[]) {
  const totals = attempts.reduce(
    (currentTotals, attempt) => ({
      correct: currentTotals.correct + attempt.stats.correctCount,
      expected: currentTotals.expected + attempt.stats.totalExpected,
    }),
    {
      correct: 0,
      expected: 0,
    }
  )

  return getPercent(totals.correct, totals.expected)
}

function getAttemptGroups(attempts: DictationAttemptApiRecord[]) {
  return attempts.reduce<Record<string, DictationAttemptApiRecord[]>>(
    (groups, attempt) => {
      groups[attempt.segmentId] = [
        ...(groups[attempt.segmentId] ?? []),
        attempt,
      ]

      return groups
    },
    {}
  )
}

function getCompletedSegmentIds(attempts: DictationAttemptApiRecord[]) {
  return new Set(
    attempts
      .filter(
        attempt =>
          attempt.isPassed ||
          attempt.action === 'reveal' ||
          attempt.action === 'skip'
      )
      .map(attempt => attempt.segmentId)
  )
}

function getMistakeTaxonomy(attempts: DictationAttemptApiRecord[]) {
  return attempts.reduce(
    (taxonomy, attempt) => {
      for (const token of attempt.feedbackTokens) {
        if (!isMistakeStatus(token.status)) continue

        taxonomy[token.status] += 1
      }

      return taxonomy
    },
    {
      extra: 0,
      missing: 0,
      spellingVariant: 0,
      wrong: 0,
    }
  )
}

function getCommonMissedWords(attempts: DictationAttemptApiRecord[]) {
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
    .slice(0, 8)
}

function getHardestSegments({
  attemptGroups,
  segments,
}: {
  attemptGroups: Record<string, DictationAttemptApiRecord[]>
  segments: DictationSegmentApiRecord[]
}) {
  const segmentMap = new Map(segments.map(segment => [segment.id, segment]))

  return Object.entries(attemptGroups)
    .map(([segmentId, attempts]) => ({
      accuracy: getAccuracyFromAttempts(attempts),
      attemptCount: attempts.length,
      label: getSegmentLabel(segmentMap.get(segmentId)),
      segmentId,
    }))
    .filter(segment => segment.attemptCount > 0)
    .sort(
      (left, right) =>
        left.accuracy - right.accuracy || right.attemptCount - left.attemptCount
    )
    .slice(0, 6)
}

export function aggregateVideoStats({
  attempts,
  segments,
}: {
  attempts: DictationAttemptApiRecord[]
  segments: DictationSegmentApiRecord[]
}): DictationVideoStatsRecord {
  const attemptGroups = getAttemptGroups(attempts)
  const completedSegmentIds = getCompletedSegmentIds(attempts)
  const checkAttempts = attempts.filter(attempt => attempt.action === 'check')
  const firstCheckAttempts = Object.values(attemptGroups)
    .map(segmentAttempts =>
      segmentAttempts.find(attempt => attempt.action === 'check')
    )
    .filter((attempt): attempt is DictationAttemptApiRecord => Boolean(attempt))
  const retryCount = checkAttempts.filter(attempt => !attempt.isPassed).length

  return {
    commonMissedWords: getCommonMissedWords(attempts),
    completedSegmentCount: completedSegmentIds.size,
    completionPercentage: getPercent(completedSegmentIds.size, segments.length),
    firstTryWordAccuracy: getAccuracyFromAttempts(firstCheckAttempts),
    hardestSegments: getHardestSegments({
      attemptGroups,
      segments,
    }),
    mistakeTaxonomy: getMistakeTaxonomy(attempts),
    overallWordAccuracy: getAccuracyFromAttempts(checkAttempts),
    revealCount: attempts.filter(attempt => attempt.action === 'reveal').length,
    retryCount,
    replayCount: attempts.reduce(
      (count, attempt) => count + attempt.replayCountDelta,
      0
    ),
    segmentCount: segments.length,
    skipCount: attempts.filter(attempt => attempt.action === 'skip').length,
    timeSpentMs: attempts.reduce(
      (duration, attempt) => duration + attempt.timeSpentMs,
      0
    ),
  }
}
