import type {
  GrammarUserItemStatus,
  UserGrammarItemApiRecord,
} from '@/modules/grammar/types'
import {
  getAlreadyKnownState,
  getInitialRecallState,
} from '@/modules/learning/recall/recallLadder'

/**
 * Turn a requested status into the fields to persist.
 *
 * Pure, so the state transitions are testable without a database, and shared
 * with the browser so a status click can show its result before the write
 * lands. Every status SETS a desired state; nothing toggles, so replaying the
 * same request (a retry, or the outbox after a reload) lands the same row.
 *
 *   learning     -> stage 1, due now. The point enters the ladder.
 *   alreadyKnow  -> never scheduled. The learner asserts they have it.
 *   ignored      -> never scheduled, and not counted as known either.
 */
export function getItemStatusPatch({
  now = new Date(),
  status,
}: {
  now?: Date
  status: GrammarUserItemStatus
}) {
  if (status === 'learning') return getInitialRecallState(now)
  if (status === 'alreadyKnow') return getAlreadyKnownState(now)

  if (status === 'ignored')
    return {
      dueAt: null,
      knownAt: null,
      knownReason: null,
      masteredAt: null,
      masteredReason: null,
      status: 'ignored' as const,
    }

  return {
    dueAt: null,
    masteredAt: now,
    masteredReason: 'manual' as const,
    status: 'mastered' as const,
  }
}

/**
 * The row the server will return for a status write, predicted in the browser.
 *
 * Mirrors the upsert: the patch is `$set` over the existing row, and a row
 * created by this write starts from the model defaults (stage 1, zero
 * counters, never reviewed).
 */
export function predictGrammarItemStatus({
  item,
  now = new Date(),
  pointSlug,
  status,
}: {
  item: UserGrammarItemApiRecord | null
  now?: Date
  pointSlug: string
  status: GrammarUserItemStatus
}): UserGrammarItemApiRecord {
  const base: UserGrammarItemApiRecord = item ?? {
    correctCount: 0,
    dueAt: null,
    lastReviewedAt: null,
    masteredAt: null,
    pointSlug,
    recallStage: 1,
    reviewCount: 0,
    status: 'learning',
    wrongCount: 0,
  }
  const patch = getItemStatusPatch({ now, status })
  const next: UserGrammarItemApiRecord = {
    ...base,
    dueAt: patch.dueAt ? patch.dueAt.toISOString() : null,
    masteredAt: patch.masteredAt ? patch.masteredAt.toISOString() : null,
    status: patch.status,
  }

  if ('recallStage' in patch) next.recallStage = patch.recallStage
  if ('correctCount' in patch) {
    next.correctCount = patch.correctCount
    next.reviewCount = patch.reviewCount
    next.wrongCount = patch.wrongCount
  }

  return next
}
