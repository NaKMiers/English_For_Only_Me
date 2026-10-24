import type { DictationAttemptAction } from '@/modules/dictation/types'

export interface DictationAttemptPayload {
  action: DictationAttemptAction
  idempotencyKey: string
  replayCountDelta?: number
  segmentId: string
  timeSpentMs?: number
  typedAnswer: string
}

export function getDictationAttemptsApiPath(sessionId: string) {
  return `/api/dictation/sessions/${sessionId}/attempts`
}
