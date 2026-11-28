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
  /** Why the save failed: the server's message, or `VOCAB_RECALL_STALE_ERROR`. */
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

/**
 * Marks a card that expired before it was saved. The summary shows its
 * translated text; every other error is the server's own message.
 */
export const VOCAB_RECALL_STALE_ERROR = 'vocab-recall:stale'

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
      error: VOCAB_RECALL_STALE_ERROR,
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
      error: outcome.status === 409 ? VOCAB_RECALL_STALE_ERROR : outcome.error,
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

export interface VocabRecallTally {
  correct: number
  /** Words that reached mastered this session (they join the garden). */
  mastered: number
  /** Right answers that moved a word one step (not to mastered). */
  movedUp: number
  notSaved: number
  reviewed: number
}

/**
 * What one recall session did, from its card results. A session only deals
 * learning words, so a result whose item is mastered was mastered now.
 */
export function tallyRecallSession(
  results: VocabRecallCardResult[]
): VocabRecallTally {
  const saved = results.filter(result => result.saveState !== 'notSaved')
  const mastered = saved.filter(
    result => result.item.status === 'mastered'
  ).length

  return {
    correct: results.filter(result => result.isCorrect).length,
    mastered,
    movedUp: saved.filter(
      result => result.isCorrect && result.item.status !== 'mastered'
    ).length,
    notSaved: results.length - saved.length,
    reviewed: results.length,
  }
}
