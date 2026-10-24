import type { OutboxEnqueueInput } from '@/lib/sync/outbox'
import type { DictationPracticePreferences } from '@/modules/dictation/preferences/dictationPreferences'
import type {
  DictationAttemptApiRecord,
  DictationSessionApiRecord,
} from '@/modules/dictation/types'
import {
  type DictationAttemptPayload,
  getDictationAttemptsApiPath,
} from '@/requests/dictationAttemptsApi'
import { getDictationSessionApiPath } from '@/requests/dictationSessionsApi'

import type { SegmentProgressRow } from './segmentProgress'

/**
 * Every practice write for one session shares one outbox lane, so attempts,
 * cursor moves, preference changes and completion reach the server in the
 * order the learner made them. Consecutive cursor moves (and consecutive
 * preference changes) collapse through their mergeKey: each one SETS a
 * desired state, so only the last one matters.
 */
export function getPracticeLane(sessionId: string) {
  return `dictation:${sessionId}`
}

export const PRACTICE_CURSOR_MERGE_KEY = 'cursor'
export const PRACTICE_PREFERENCES_MERGE_KEY = 'preferences'

export function buildAttemptWrite(
  sessionId: string,
  payload: DictationAttemptPayload
): OutboxEnqueueInput {
  return {
    body: payload,
    // The idempotency key doubles as the outbox id, so a replay after a reload
    // is deduped by the route's prior-attempt lookup.
    id: payload.idempotencyKey,
    lane: getPracticeLane(sessionId),
    method: 'POST',
    url: getDictationAttemptsApiPath(sessionId),
  }
}

export function buildCursorWrite(
  sessionId: string,
  segment: { id: string; order: number }
): OutboxEnqueueInput {
  return {
    body: {
      currentSegmentId: segment.id,
      currentSegmentOrder: segment.order,
    },
    lane: getPracticeLane(sessionId),
    mergeKey: PRACTICE_CURSOR_MERGE_KEY,
    method: 'PATCH',
    url: getDictationSessionApiPath(sessionId),
  }
}

/** The session-scoped preferences, always sent whole so merging is lossless. */
export function buildPreferencesWrite(
  sessionId: string,
  preferences: Pick<
    DictationPracticePreferences,
    'isVideoHidden' | 'playbackSpeed' | 'showShortcuts'
  >
): OutboxEnqueueInput {
  return {
    body: {
      isVideoHidden: preferences.isVideoHidden,
      playbackSpeed: preferences.playbackSpeed,
      showShortcuts: preferences.showShortcuts,
    },
    lane: getPracticeLane(sessionId),
    mergeKey: PRACTICE_PREFERENCES_MERGE_KEY,
    method: 'PATCH',
    url: getDictationSessionApiPath(sessionId),
  }
}

export function buildCompletionWrite(sessionId: string): OutboxEnqueueInput {
  return {
    body: { status: 'completed' },
    lane: getPracticeLane(sessionId),
    method: 'PATCH',
    url: getDictationSessionApiPath(sessionId),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * The session a delivered write returned, or null for a write that was merged
 * away before it was sent (`{superseded: true}`) or carried no session.
 */
export function readSessionFromWriteResult(
  data: unknown
): DictationSessionApiRecord | null {
  if (!isRecord(data) || data.superseded === true) return null

  const session = data.session

  if (!isRecord(session) || typeof session.id !== 'string') return null

  return session as unknown as DictationSessionApiRecord
}

export interface AttemptWriteResult {
  attempt: DictationAttemptApiRecord | null
  progress: SegmentProgressRow | null
}

export function readAttemptWriteResult(data: unknown): AttemptWriteResult {
  if (!isRecord(data)) return { attempt: null, progress: null }

  const attempt = isRecord(data.attempt)
    ? (data.attempt as unknown as DictationAttemptApiRecord)
    : null
  const progress =
    isRecord(data.progress) && typeof data.progress.segmentId === 'string'
      ? (data.progress as unknown as SegmentProgressRow)
      : null

  return { attempt, progress }
}
