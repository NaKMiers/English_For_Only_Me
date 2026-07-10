import type {
  DictationAttemptApiRecord,
  DictationCorrectionStatsRecord,
  DictationCorrectionTokenStatus,
} from '@/modules/dictation/types'

const EMPTY_ATTEMPT_STATS: DictationCorrectionStatsRecord = {
  accuracy: 0,
  correctCount: 0,
  extraCount: 0,
  missingCount: 0,
  spellingVariantCount: 0,
  totalExpected: 0,
  wrongCount: 0,
}

interface AttemptFeedbackTokenInput {
  actual?: string | null
  actualOriginal?: string | null
  expected?: string | null
  expectedOriginal?: string | null
  status: DictationCorrectionTokenStatus
}

function toFeedbackTokens(
  tokens: AttemptFeedbackTokenInput[] = []
): DictationAttemptApiRecord['feedbackTokens'] {
  return tokens.map(token => ({
    actual: token.actual ?? null,
    actualOriginal: token.actualOriginal ?? null,
    expected: token.expected ?? null,
    expectedOriginal: token.expectedOriginal ?? null,
    status: token.status,
  }))
}

export function toDictationAttemptRecord(attempt: {
  _id: unknown
  action: DictationAttemptApiRecord['action']
  createdAt: Date
  expectedTextSnapshot: string
  feedbackTokens?: AttemptFeedbackTokenInput[]
  idempotencyKey: string
  isPassed: boolean
  userId: string
  replayCountDelta?: number
  segmentId: unknown
  sessionId: unknown
  stats?: DictationAttemptApiRecord['stats'] | null
  timeSpentMs?: number
  transcriptId: unknown
  typedAnswer?: string
  updatedAt: Date
  videoId: unknown
}): DictationAttemptApiRecord {
  return {
    id: String(attempt._id),
    action: attempt.action,
    createdAt: attempt.createdAt,
    expectedTextSnapshot: attempt.expectedTextSnapshot,
    feedbackTokens: toFeedbackTokens(attempt.feedbackTokens),
    idempotencyKey: attempt.idempotencyKey,
    isPassed: attempt.isPassed,
    userId: attempt.userId,
    replayCountDelta: attempt.replayCountDelta ?? 0,
    segmentId: String(attempt.segmentId),
    sessionId: String(attempt.sessionId),
    stats: attempt.stats ?? EMPTY_ATTEMPT_STATS,
    timeSpentMs: attempt.timeSpentMs ?? 0,
    transcriptId: String(attempt.transcriptId),
    typedAnswer: attempt.typedAnswer ?? '',
    updatedAt: attempt.updatedAt,
    videoId: String(attempt.videoId),
  }
}
