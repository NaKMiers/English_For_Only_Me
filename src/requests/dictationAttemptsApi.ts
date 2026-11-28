import type { DictationAttemptAction } from '@/modules/dictation/types'

export interface DictationAttemptPayload {
  action: DictationAttemptAction
  idempotencyKey: string
  replayCountDelta?: number
  /**
   * From the review queue (`?segment=`): the attempt is recorded and a pass
   * solves the sentence's review items, but the session's position and status
   * are never touched.
   */
  review?: boolean
  segmentId: string
  timeSpentMs?: number
  typedAnswer: string
}

export function getDictationAttemptsApiPath(sessionId: string) {
  return `/api/dictation/sessions/${sessionId}/attempts`
}
