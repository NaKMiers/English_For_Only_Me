import type { DictationAttemptApiRecord } from '@/modules/dictation/types'

import type { DictationCorrectionResult } from './types'

interface CreateLocalAttemptInput {
  correction: DictationCorrectionResult
  expectedText: string
  idempotencyKey: string
  userId: string
  replayCountDelta: number
  segmentId: string
  sessionId: string
  timeSpentMs: number
  transcriptId: string
  typedAnswer: string
  videoId: string
}

/**
 * Builds an optimistic attempt record from a locally computed correction so the
 * UI can render feedback instantly, without waiting for the server round-trip.
 * The server recomputes the identical correction when persisting the attempt,
 * so this record matches what the API eventually returns (aside from ids/dates).
 */
export function createLocalDictationAttempt({
  correction,
  expectedText,
  idempotencyKey,
  userId,
  replayCountDelta,
  segmentId,
  sessionId,
  timeSpentMs,
  transcriptId,
  typedAnswer,
  videoId,
}: CreateLocalAttemptInput): DictationAttemptApiRecord {
  const now = new Date()

  return {
    id: `local-${idempotencyKey}`,
    userId,
    videoId,
    transcriptId,
    sessionId,
    segmentId,
    action: correction.action,
    idempotencyKey,
    typedAnswer,
    expectedTextSnapshot: expectedText,
    replayCountDelta,
    timeSpentMs,
    isPassed: correction.isPassed,
    feedbackTokens: correction.feedbackTokens,
    stats: correction.stats,
    createdAt: now,
    updatedAt: now,
  }
}
