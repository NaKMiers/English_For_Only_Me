import type { OutboxEnqueueInput } from '@/lib/sync/outbox'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import {
  IELTS_API_PATHS,
  IELTS_OUTBOX_LANE_PREFIX,
  type IeltsSkill,
} from '@/modules/ielts/constants'
import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'

export interface IeltsStartAttemptBody {
  idempotencyKey: string
  mode: 'practice' | 'mock'
  scope: { kind: 'skill' } | { kind: 'part'; part: number }
  sessionId: string | null
  skill: IeltsSkill
  testSlug: string
}

export interface IeltsStartAttemptResponse {
  attempt: IeltsAttemptRecord
  mode: 'created' | 'resumed' | 'idempotent'
}

export interface IeltsEvidenceResponse {
  number: number
  sectionKey: string
  notGiven: boolean
  evidence: { quote: string; blockIndex: number } | null
}

export class IeltsApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'IeltsApiError'
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T

  let message = 'Yêu cầu IELTS bị lỗi.'

  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') message = body.message
  } catch {
    // Keep the generic message.
  }

  throw new IeltsApiError(message, response.status)
}

export async function startIeltsAttemptApi(
  body: IeltsStartAttemptBody
): Promise<IeltsStartAttemptResponse> {
  const response = await fetch(IELTS_API_PATHS.attempts, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson(response)
}

export async function startIeltsDrillApi(body: {
  idempotencyKey: string
  skill: 'listening' | 'reading'
  type: string
}): Promise<{ attempt: IeltsAttemptRecord }> {
  const response = await fetch(IELTS_API_PATHS.drills, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson(response)
}

export async function readIeltsAttemptApi(
  attemptId: string
): Promise<{ attempt: IeltsAttemptRecord }> {
  const response = await fetch(IELTS_API_PATHS.attempt(attemptId), {
    cache: 'no-store',
  })

  return readJson(response)
}

export async function readIeltsEvidenceApi(
  attemptId: string,
  number: number
): Promise<IeltsEvidenceResponse> {
  const response = await fetch(IELTS_API_PATHS.evidence(attemptId, number), {
    cache: 'no-store',
  })

  return readJson(response)
}

export async function postIeltsAudioEventApi(
  attemptId: string,
  body:
    | { kind: 'part-started'; part: number }
    | { kind: 'interrupted' | 'resumed'; positionSec: number }
): Promise<{ attempt: IeltsAttemptRecord }> {
  const response = await fetch(IELTS_API_PATHS.audioEvents(attemptId), {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson(response)
}

export async function gradeIeltsWritingApi(
  attemptId: string,
  task: 1 | 2
): Promise<{ attempt: IeltsAttemptRecord }> {
  const response = await fetch(IELTS_API_PATHS.grade(attemptId), {
    body: JSON.stringify({ task }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson(response)
}

/** One lane per attempt: every save and the submit run in order. */
export const ieltsAttemptLane = (attemptId: string) =>
  `${IELTS_OUTBOX_LANE_PREFIX}${attemptId}`

/**
 * Autosave as an outbox write. The mergeKey makes a newer snapshot replace a
 * queued older one, so a long offline stretch sends only the latest.
 */
export function buildIeltsAnswersWrite(
  attemptId: string,
  answers: IeltsAnswers,
  seq: number
): OutboxEnqueueInput {
  return {
    body: { answers, seq },
    lane: ieltsAttemptLane(attemptId),
    mergeKey: `attempt:${attemptId}`,
    method: 'PUT',
    url: IELTS_API_PATHS.answers(attemptId),
  }
}

/** Submit on the same lane, so it lands after any queued save. */
export function buildIeltsSubmitWrite(
  attemptId: string,
  answers: IeltsAnswers,
  seq: number
): OutboxEnqueueInput {
  const idempotencyKey = `submit-${attemptId}`

  return {
    body: { answers, idempotencyKey, seq },
    id: idempotencyKey,
    lane: ieltsAttemptLane(attemptId),
    method: 'POST',
    url: IELTS_API_PATHS.submit(attemptId),
  }
}
