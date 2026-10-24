import type { Outbox, OutboxResult } from '@/lib/sync/outbox'
import { VOCAB_API_PATHS } from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
  VocabLearningSource,
} from '@/modules/vocabulary/types'

import { invalidateCachedVocabEntry } from './vocabLookupCache'

/**
 * Every "Should Learn" / "Already Know" press, from any screen, goes through
 * one ordered outbox lane. Each write SETS a desired status (never toggles),
 * so a replay after a reload, or from a second tab, lands the same state.
 *
 * The single-item route is used instead of a debounced batch: each press is
 * persisted to the outbox the moment it happens (tab close cannot lose it),
 * delivery order is press order, and `mergeKey` collapses repeat presses on
 * the same word that are still queued, so the last decision per word wins.
 */
export const VOCAB_ITEMS_LANE = 'vocab:items'

export type VocabMarkStatus = 'shouldLearn' | 'alreadyKnow'

export interface VocabItemStatusWrite {
  source: VocabLearningSource
  status: VocabMarkStatus
  vocabEntryId: string
}

export type VocabItemWriteOutcome =
  | { item: UserVocabItemApiRecord; kind: 'saved' }
  | { kind: 'superseded' }
  | { error: string; kind: 'failed'; status: number }

export function toVocabItemWriteOutcome(
  result: OutboxResult
): VocabItemWriteOutcome {
  if (!result.ok)
    return { error: result.error, kind: 'failed', status: result.status }

  const data = result.data as {
    item?: UserVocabItemApiRecord
    superseded?: boolean
  } | null

  if (data?.superseded) return { kind: 'superseded' }
  if (data?.item) return { item: data.item, kind: 'saved' }

  return {
    error: 'Could not update this word.',
    kind: 'failed',
    status: result.status,
  }
}

export async function enqueueVocabItemStatus(
  outbox: Outbox,
  write: VocabItemStatusWrite
) {
  const result = await outbox.enqueue({
    body: {
      source: write.source,
      status: write.status,
      vocabEntryId: write.vocabEntryId,
    },
    lane: VOCAB_ITEMS_LANE,
    mergeKey: `item:${write.vocabEntryId}`,
    url: VOCAB_API_PATHS.items,
  })

  // The word's state may have changed (or the optimistic one was rolled
  // back): the next quick lookup reads it fresh instead of from memory.
  invalidateCachedVocabEntry(write.vocabEntryId)

  return toVocabItemWriteOutcome(result)
}

/**
 * Tracks the newest in-flight write per word so out-of-order results resolve
 * correctly when a word is pressed several times:
 *
 * - a superseded or older result never touches the UI (a newer write owns it),
 * - a saved result becomes the new "confirmed" state to roll back to, and
 * - only the newest write's failure rolls back, to the last confirmed state.
 */
export type EntryWriteSettlement<S> =
  | { kind: 'apply'; state: S }
  | { kind: 'ignore' }
  | { kind: 'rollback'; state: S }

export function createEntryWriteTracker<S>() {
  const entries = new Map<string, { confirmed: S; latest: number }>()
  let sequence = 0

  return {
    begin(entryId: string, current: S) {
      sequence += 1

      const existing = entries.get(entryId)

      if (existing) existing.latest = sequence
      else entries.set(entryId, { confirmed: current, latest: sequence })

      return sequence
    },
    hasPending(entryId: string) {
      return entries.has(entryId)
    },
    pendingCount() {
      return entries.size
    },
    settle(
      entryId: string,
      ticket: number,
      outcome:
        | { kind: 'failed' }
        | { kind: 'saved'; state: S }
        | {
            kind: 'superseded'
          }
    ): EntryWriteSettlement<S> {
      const entry = entries.get(entryId)

      if (!entry || outcome.kind === 'superseded') return { kind: 'ignore' }

      if (outcome.kind === 'saved') entry.confirmed = outcome.state

      if (ticket !== entry.latest) return { kind: 'ignore' }

      entries.delete(entryId)

      return outcome.kind === 'saved'
        ? { kind: 'apply', state: outcome.state }
        : { kind: 'rollback', state: entry.confirmed }
    },
  }
}

/** The item a mark will produce, shown before the server answers. */
export function buildOptimisticUserItem({
  entry,
  now = new Date(),
  source,
  status,
}: {
  entry: VocabEntryWithUserStateRecord
  now?: Date
  source: VocabLearningSource
  status: VocabMarkStatus
}): UserVocabItemApiRecord {
  const existingItem = entry.userItem

  // Mirrors setUserVocabItemStatus: "Should Learn" on a word already being
  // learned keeps its progress instead of restarting the ladder.
  if (status === 'shouldLearn' && existingItem?.status === 'learning')
    return existingItem

  const base = {
    correctCount: existingItem?.correctCount ?? 0,
    createdAt: existingItem?.createdAt ?? now,
    firstSeenAt: existingItem?.firstSeenAt ?? now,
    id: existingItem?.id ?? `optimistic-${entry.entry.id}`,
    lastReviewedAt: existingItem?.lastReviewedAt ?? null,
    notes: existingItem?.notes ?? null,
    reviewCount: existingItem?.reviewCount ?? 0,
    source,
    updatedAt: now,
    userId: existingItem?.userId ?? 'optimistic',
    vocabEntryId: entry.entry.id,
    wrongCount: existingItem?.wrongCount ?? 0,
  }

  if (status === 'shouldLearn')
    return {
      ...base,
      correctCount: 0,
      dueAt: now,
      knownAt: null,
      knownReason: null,
      masteredAt: null,
      masteredReason: null,
      recallStage: 1,
      reviewCount: 0,
      status: 'learning',
      wrongCount: 0,
    }

  return {
    ...base,
    dueAt: null,
    knownAt: now,
    knownReason: 'manual',
    masteredAt: null,
    masteredReason: null,
    recallStage: 1,
    status: 'alreadyKnow',
  }
}
