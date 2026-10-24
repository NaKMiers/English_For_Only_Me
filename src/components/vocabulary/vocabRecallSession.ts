import { applyRecallAnswer } from '@/modules/learning/recall/recallLadder'
import type { Outbox, OutboxResult } from '@/lib/sync/outbox'
import {
  VOCAB_API_PATHS,
  VOCAB_RECALL_PREFETCH_REMAINING,
} from '@/modules/vocabulary/constants'
import {
  decodeVocabRecallTaskPayload,
  gradeVocabRecallAnswer,
} from '@/modules/vocabulary/recall/recallTaskPayload'
import type {
  UserVocabItemApiRecord,
  VocabRecallAnswerAction,
  VocabRecallTaskRecord,
} from '@/modules/vocabulary/types'

import { invalidateCachedVocabEntry } from './vocabLookupCache'

/**
 * Client-first vocab recall: the browser grades the answer from the task token
 * payload and predicts the next ladder state, so the verdict shows instantly.
 * The answer is then queued in the outbox and the server, which re-grades with
 * the same shared grader, has the final word.
 *
 *   click --> grade locally --> verdict + predicted stage (instant)
 *               |
 *               +--> outbox 'vocab:recall' --> 2xx: server verdict + item win
 *                                          --> 4xx: card "not saved" (stays due)
 */
export const VOCAB_RECALL_LANE = 'vocab:recall'

export type VocabRecallSaveState = 'notSaved' | 'saved' | 'saving'

export interface VocabRecallCardResult {
  error: string | null
  isCorrect: boolean
  item: UserVocabItemApiRecord
  itemId: string
  saveState: VocabRecallSaveState
  taskId: string
  term: string
}

export interface VocabRecallAnswerInput {
  action: VocabRecallAnswerAction | null
  selectedOptionId: string | null
  task: VocabRecallTaskRecord
}

const STALE_CARD_MESSAGE =
  'This card expired before it was saved. It stays due for your next review.'

/**
 * One key per task, derived from the server-minted task id, so a double click,
 * an outbox retry and a replay after reload are all the same attempt.
 */
export function getVocabRecallIdempotencyKey(taskId: string) {
  return `vocab-recall:${taskId}`
}

export function gradeVocabRecallTaskLocally({
  action,
  now = new Date(),
  selectedOptionId,
  task,
}: VocabRecallAnswerInput & { now?: Date }) {
  const payload = decodeVocabRecallTaskPayload(task.token)

  if (!payload || payload.taskId !== task.taskId) return null

  const isCorrect = gradeVocabRecallAnswer({
    action,
    correctOptionId: payload.correctOptionId,
    selectedOptionId,
  })
  const patch = applyRecallAnswer({ isCorrect, item: task.item, now })
  const item: UserVocabItemApiRecord = {
    ...task.item,
    ...patch,
    updatedAt: now,
  }

  return { isCorrect, item }
}

/** The result recorded for a card the moment it is answered. */
export function createVocabRecallCardResult(
  input: VocabRecallAnswerInput & { now?: Date }
): VocabRecallCardResult {
  const local = gradeVocabRecallTaskLocally(input)
  const base = {
    itemId: input.task.item.id,
    taskId: input.task.taskId,
    term: input.task.entry.term,
  }

  // An unreadable token is also one the server will reject, so there is
  // nothing to send: say so instead of guessing a verdict.
  if (!local)
    return {
      ...base,
      error: STALE_CARD_MESSAGE,
      isCorrect: false,
      item: input.task.item,
      saveState: 'notSaved',
    }

  return {
    ...base,
    error: null,
    isCorrect: local.isCorrect,
    item: local.item,
    saveState: 'saving',
  }
}

export async function enqueueVocabRecallAnswer(
  outbox: Outbox,
  { action, selectedOptionId, task }: VocabRecallAnswerInput
) {
  const idempotencyKey = getVocabRecallIdempotencyKey(task.taskId)
  const outcome = await outbox.enqueue({
    body: { action, idempotencyKey, selectedOptionId, token: task.token },
    id: idempotencyKey,
    lane: VOCAB_RECALL_LANE,
    url: VOCAB_API_PATHS.recallAnswer,
  })

  // Recall moved the word's stage or status: a cached quick lookup of it
  // would show the old one.
  invalidateCachedVocabEntry(task.entry.id)

  return outcome
}

/** Fold the server's answer into a card result. Server wins. */
export function reconcileVocabRecallCardResult(
  result: VocabRecallCardResult,
  outcome: OutboxResult
): VocabRecallCardResult {
  if (!outcome.ok)
    return {
      ...result,
      error: outcome.status === 409 ? STALE_CARD_MESSAGE : outcome.error,
      saveState: 'notSaved',
    }

  const data = outcome.data as {
    isCorrect?: boolean
    item?: UserVocabItemApiRecord
  } | null

  if (typeof data?.isCorrect !== 'boolean' || !data.item)
    return { ...result, saveState: 'saved' }

  return {
    ...result,
    error: null,
    isCorrect: data.isCorrect,
    item: data.item,
    saveState: 'saved',
  }
}

export function shouldPrefetchVocabRecallPage({
  isFetching,
  nextCursor,
  remaining,
}: {
  isFetching: boolean
  nextCursor: string | null
  remaining: number
}) {
  return (
    !isFetching &&
    nextCursor !== null &&
    remaining <= VOCAB_RECALL_PREFETCH_REMAINING
  )
}

/**
 * Append a fetched page, skipping cards already held and items answered in
 * this session (their answer may still be on its way to the server).
 */
export function mergeVocabRecallPage({
  answeredItemIds,
  current,
  incoming,
}: {
  answeredItemIds: ReadonlySet<string>
  current: VocabRecallTaskRecord[]
  incoming: VocabRecallTaskRecord[]
}) {
  const heldItemIds = new Set(current.map(task => task.item.id))
  const fresh = incoming.filter(
    task => !heldItemIds.has(task.item.id) && !answeredItemIds.has(task.item.id)
  )

  return fresh.length > 0 ? [...current, ...fresh] : current
}

/** True when the card's token is (nearly) past its 30-minute lifetime. */
export function isVocabRecallTaskExpired(
  task: VocabRecallTaskRecord,
  now = Date.now(),
  marginMs = 60_000
) {
  const payload = decodeVocabRecallTaskPayload(task.token)

  return payload ? payload.expiresAt - marginMs <= now : false
}
