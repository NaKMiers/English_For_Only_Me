import type { DictationSessionStatus } from '@/modules/dictation/types'

export interface CursorSegment {
  id: string
  order: number
}

export type AttemptCursorDecision =
  | { type: 'complete' }
  | { type: 'keep' }
  | { order: number; segmentId: string; type: 'move' }

/**
 * Where the session cursor goes after an attempt is saved.
 *
 * Attempts are accepted for ANY segment of the session's transcript, because
 * the browser grades locally and the learner may already have moved on by the
 * time a queued attempt lands. The cursor follows the attempt, not the old
 * server position:
 *
 *   advancing attempt (pass / skip) -> the segment after the ATTEMPTED one,
 *                                      or complete when there is none
 *   any other attempt               -> the attempted segment, when the cursor
 *                                      sits somewhere else
 *
 * A session that is no longer active keeps its cursor and status: the attempt
 * is still recorded, but a finished session is not reopened.
 */
export function resolveAttemptCursor({
  attemptedSegment,
  currentSegmentId,
  nextSegment,
  sessionStatus,
  shouldAdvance,
}: {
  attemptedSegment: CursorSegment
  currentSegmentId: string | null
  /** The segment after the attempted one; only looked up when advancing. */
  nextSegment: CursorSegment | null
  sessionStatus: DictationSessionStatus
  shouldAdvance: boolean
}): AttemptCursorDecision {
  if (sessionStatus !== 'active') return { type: 'keep' }

  if (shouldAdvance)
    return nextSegment
      ? { order: nextSegment.order, segmentId: nextSegment.id, type: 'move' }
      : { type: 'complete' }

  if (attemptedSegment.id !== currentSegmentId)
    return {
      order: attemptedSegment.order,
      segmentId: attemptedSegment.id,
      type: 'move',
    }

  return { type: 'keep' }
}

/**
 * Which session states accept a new attempt. A completed session still takes
 * attempts (a learner revisiting an earlier sentence after the last one
 * completed it server-side), while an abandoned one was superseded by a newer
 * session and refuses them.
 */
export function canRecordAttemptForSession(status: DictationSessionStatus) {
  return status !== 'abandoned'
}
