import type {
  DictationAttemptApiRecord,
  DictationMistakeTaxonomyRecord,
  DictationReviewItemApiRecord,
  DictationReviewItemKind,
  DictationReviewItemReason,
  DictationReviewStatsSnapshotRecord,
  DictationSegmentApiRecord,
} from '@/modules/dictation/types'

export const REVIEW_RETRY_THRESHOLD = 2
export const REVIEW_LOW_ACCURACY_THRESHOLD = 70
export const REVIEW_REPEATED_MISTAKE_THRESHOLD = 2

export interface ReviewCandidate {
  dueAt: Date
  kind: DictationReviewItemKind
  label: string
  priority: number
  reason: DictationReviewItemReason
  segmentId: string
  statsSnapshot: DictationReviewStatsSnapshotRecord
  videoId: string
}

function getPercent(part: number, whole: number) {
  if (whole <= 0) return 0

  return Math.round((part / whole) * 100)
}

function getSegmentLabel(segment: DictationSegmentApiRecord | undefined) {
  if (!segment) return 'Weak segment'

  return segment.text.length > 120
    ? `${segment.text.slice(0, 120).trim()}...`
    : segment.text
}

function getMistakeTaxonomy(
  attempts: DictationAttemptApiRecord[]
): DictationMistakeTaxonomyRecord {
  return attempts.reduce(
    (taxonomy, attempt) => {
      for (const token of attempt.feedbackTokens) {
        if (token.status === 'extra') taxonomy.extra += 1
        if (token.status === 'missing') taxonomy.missing += 1
        if (token.status === 'spellingVariant') taxonomy.spellingVariant += 1
        if (token.status === 'wrong') taxonomy.wrong += 1
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

function getStatsSnapshot(
  attempts: DictationAttemptApiRecord[]
): DictationReviewStatsSnapshotRecord {
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
  const lastAttempt = attempts[attempts.length - 1]

  return {
    accuracy: getPercent(totals.correct, totals.expected),
    attemptCount: attempts.length,
    lastAction: lastAttempt?.action ?? 'check',
    mistakeTaxonomy: getMistakeTaxonomy(attempts),
  }
}

function getSegmentAttempts(attempts: DictationAttemptApiRecord[]) {
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

function getFirstCheckAccuracy(attempts: DictationAttemptApiRecord[]) {
  const firstCheck = attempts.find(attempt => attempt.action === 'check')

  if (!firstCheck) return null

  return firstCheck.stats.accuracy
}

function getCandidateBase({
  attempts,
  dueAt,
  segment,
  segmentId,
}: {
  attempts: DictationAttemptApiRecord[]
  dueAt: Date
  segment: DictationSegmentApiRecord | undefined
  segmentId: string
}) {
  const videoId = attempts[0]?.videoId ?? segment?.videoId ?? ''

  return {
    dueAt,
    kind: 'segment' as const,
    label: getSegmentLabel(segment),
    segmentId,
    statsSnapshot: getStatsSnapshot(attempts),
    videoId,
  }
}

function hasRepeatedMistake(snapshot: DictationReviewStatsSnapshotRecord) {
  return Object.values(snapshot.mistakeTaxonomy).some(
    count => count >= REVIEW_REPEATED_MISTAKE_THRESHOLD
  )
}

export function buildReviewCandidates({
  attempts,
  dueAt = new Date(),
  segments,
}: {
  attempts: DictationAttemptApiRecord[]
  dueAt?: Date
  segments: DictationSegmentApiRecord[]
}): ReviewCandidate[] {
  const segmentMap = new Map(segments.map(segment => [segment.id, segment]))
  const segmentAttempts = getSegmentAttempts(attempts)
  const candidates: ReviewCandidate[] = []

  for (const [segmentId, currentAttempts] of Object.entries(segmentAttempts)) {
    const segment = segmentMap.get(segmentId)
    const base = getCandidateBase({
      attempts: currentAttempts,
      dueAt,
      segment,
      segmentId,
    })
    const checkFailures = currentAttempts.filter(
      attempt => attempt.action === 'check' && !attempt.isPassed
    ).length
    const firstCheckAccuracy = getFirstCheckAccuracy(currentAttempts)
    const revealed = currentAttempts.some(
      attempt => attempt.action === 'reveal'
    )
    const skipped = currentAttempts.some(attempt => attempt.action === 'skip')

    if (skipped)
      candidates.push({
        ...base,
        priority: 95,
        reason: 'skipped',
      })

    if (revealed)
      candidates.push({
        ...base,
        priority: 90,
        reason: 'revealed',
      })

    if (checkFailures > REVIEW_RETRY_THRESHOLD)
      candidates.push({
        ...base,
        priority: 80,
        reason: 'highRetry',
      })

    if (
      firstCheckAccuracy !== null &&
      firstCheckAccuracy < REVIEW_LOW_ACCURACY_THRESHOLD
    )
      candidates.push({
        ...base,
        priority: 70,
        reason: 'lowAccuracy',
      })

    if (hasRepeatedMistake(base.statsSnapshot))
      candidates.push({
        ...base,
        priority: 75,
        reason: 'repeatedMistake',
      })
  }

  return candidates
}

export function mergeReviewCandidates({
  candidates,
  existingItems,
}: {
  candidates: ReviewCandidate[]
  existingItems: DictationReviewItemApiRecord[]
}) {
  const activeKeys = new Set(
    existingItems
      .filter(item => item.status === 'due' || item.status === 'scheduled')
      .map(item => `${item.segmentId}:${item.reason}`)
  )

  return candidates.filter(candidate => {
    const key = `${candidate.segmentId}:${candidate.reason}`

    if (activeKeys.has(key)) return false

    activeKeys.add(key)
    return true
  })
}

export function dismissReviewItem(
  item: DictationReviewItemApiRecord,
  reviewedAt: Date = new Date()
): DictationReviewItemApiRecord {
  return {
    ...item,
    lastReviewedAt: reviewedAt,
    status: 'dismissed',
    updatedAt: reviewedAt,
  }
}

export function completeReviewItem(
  item: DictationReviewItemApiRecord,
  reviewedAt: Date = new Date()
): DictationReviewItemApiRecord {
  return {
    ...item,
    lastReviewedAt: reviewedAt,
    status: 'completed',
    updatedAt: reviewedAt,
  }
}

export function getReviewActionStatus(action: 'complete' | 'dismiss') {
  return action === 'complete' ? 'completed' : 'dismissed'
}
