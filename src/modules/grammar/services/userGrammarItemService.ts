import 'server-only'

import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import { getItemStatusPatch } from '@/modules/grammar/recall/itemStatusPatch'
import type {
  GrammarUserItemStatus,
  UserGrammarItemApiRecord,
} from '@/modules/grammar/types'

/**
 * Shape accepted by the mapper. Dates are optional because Mongoose lean
 * documents type nullable fields as `Date | null | undefined`.
 */
export interface UserGrammarItemLike {
  correctCount: number
  dueAt?: Date | null
  lastReviewedAt?: Date | null
  masteredAt?: Date | null
  pointSlug: string
  recallStage: number
  reviewCount: number
  status: string
  wrongCount: number
}

export function toUserGrammarItemRecord(
  item: UserGrammarItemLike
): UserGrammarItemApiRecord {
  return {
    correctCount: item.correctCount,
    dueAt: item.dueAt ? item.dueAt.toISOString() : null,
    lastReviewedAt: item.lastReviewedAt
      ? item.lastReviewedAt.toISOString()
      : null,
    masteredAt: item.masteredAt ? item.masteredAt.toISOString() : null,
    pointSlug: item.pointSlug,
    recallStage: item.recallStage,
    reviewCount: item.reviewCount,
    status: item.status as GrammarUserItemStatus,
    wrongCount: item.wrongCount,
  }
}

// Re-exported so existing server callers and tests keep one import path. The
// function lives in `recall/itemStatusPatch.ts` because the browser predicts a
// status click with it too.
export { getItemStatusPatch }

/**
 * Resolve a slug through any merge redirect, so a bookmark or a stale client
 * pointing at a retired slug still writes against the surviving point.
 */
async function resolveLiveSlug(pointSlug: string) {
  const point = await GrammarPointModel.findOne({ slug: pointSlug })
    .select('slug mergedInto')
    .lean()

  if (!point) return null

  return point.mergedInto ?? point.slug
}

/**
 * Create or update this learner's state for one point.
 *
 * Rows are created lazily here - the first time the learner interacts with a
 * point - rather than pre-minted for all 162 on first visit. That is why the
 * browse list left-joins and why there is no `new` status.
 *
 * This SETS the requested status (`$set` of a fixed patch, never a toggle), so
 * the client outbox can replay it safely after a retry or a reload.
 */
export async function setGrammarItemStatus({
  actorId,
  now = new Date(),
  pointSlug,
  status,
}: {
  actorId: string
  now?: Date
  pointSlug: string
  status: GrammarUserItemStatus
}): Promise<UserGrammarItemApiRecord | null> {
  const liveSlug = await resolveLiveSlug(pointSlug)

  if (!liveSlug) return null

  const item = await UserGrammarItemModel.findOneAndUpdate(
    { actorId, pointSlug: liveSlug },
    { $set: getItemStatusPatch({ now, status }) },
    { new: true, setDefaultsOnInsert: true, upsert: true }
  ).lean()

  return item ? toUserGrammarItemRecord(item) : null
}

export async function getGrammarItemsForActor({
  actorId,
  pointSlugs,
}: {
  actorId: string
  pointSlugs: string[]
}) {
  if (!actorId || pointSlugs.length === 0)
    return new Map<string, UserGrammarItemApiRecord>()

  const items = await UserGrammarItemModel.find({
    actorId,
    pointSlug: { $in: pointSlugs },
  }).lean()

  return new Map(
    items.map(item => [item.pointSlug, toUserGrammarItemRecord(item)])
  )
}
