import 'server-only'

import { Types } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'
import {
  buildReviewCandidates,
  type ReviewCandidate,
} from '@/modules/dictation/review/reviewScheduler'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import type { DictationReviewItemStatus } from '@/modules/dictation/types'

const ACTIVE_REVIEW_STATUSES: DictationReviewItemStatus[] = ['due', 'scheduled']
const CLOSED_REVIEW_STATUSES: DictationReviewItemStatus[] = [
  'completed',
  'dismissed',
]

type ReviewAttemptInput = Parameters<typeof toDictationAttemptRecord>[0]
type ReviewSegmentInput = Parameters<typeof toDictationSegmentRecord>[0]

interface ExistingReviewItemKey {
  kind: string
  /** When the item was solved or dismissed (closed items only). */
  lastReviewedAt?: Date | null
  reason: string
  segmentId: unknown
  /** Missing means active (older callers pass active items only). */
  status?: string
}

function isActiveStatus(status: string | undefined) {
  return (
    status === undefined ||
    ACTIVE_REVIEW_STATUSES.includes(status as DictationReviewItemStatus)
  )
}

/**
 * Per segment, when its last review item was closed (solved in the review
 * queue, or dismissed). Attempts up to then are already reviewed: they must
 * not raise the same item again on the next recompute.
 */
function closedAtBySegment(items: ExistingReviewItemKey[]) {
  const closedAt = new Map<string, number>()

  for (const item of items) {
    if (
      !item.status ||
      !CLOSED_REVIEW_STATUSES.includes(item.status as DictationReviewItemStatus)
    )
      continue
    if (!item.lastReviewedAt) continue

    const key = String(item.segmentId)
    const at = new Date(item.lastReviewedAt).getTime()

    closedAt.set(key, Math.max(closedAt.get(key) ?? 0, at))
  }

  return closedAt
}

/**
 * The review candidates that do not already have an active item. Shared by the
 * video-wide and the segment-scoped recompute so both decide identically:
 * buildReviewCandidates groups by segment, so feeding it one segment's attempts
 * yields exactly that segment's share of the video-wide result. Only attempts
 * made after a segment's last closed item count, so a sentence solved in the
 * review queue stays solved until the learner misses it again.
 */
export function selectNewReviewCandidates({
  attempts,
  existingItems,
  segments,
}: {
  attempts: ReviewAttemptInput[]
  existingItems: ExistingReviewItemKey[]
  segments: ReviewSegmentInput[]
}): ReviewCandidate[] {
  const existingKeys = new Set(
    existingItems
      .filter(item => isActiveStatus(item.status))
      .map(item => `${String(item.segmentId)}:${item.kind}:${item.reason}`)
  )
  const closedAt = closedAtBySegment(existingItems)
  const records = attempts.map(toDictationAttemptRecord).filter(attempt => {
    const at = closedAt.get(attempt.segmentId)

    return at === undefined || new Date(attempt.createdAt).getTime() > at
  })

  return buildReviewCandidates({
    attempts: records,
    segments: segments.map(toDictationSegmentRecord),
  }).filter(
    candidate =>
      !existingKeys.has(
        `${candidate.segmentId}:${candidate.kind}:${candidate.reason}`
      )
  )
}

interface InsertManyWriteError {
  code?: number
  err?: { code?: number }
}

/**
 * True when every write error of an unordered insertMany is a duplicate key.
 * Mongoose copies each driver WriteError into a plain object, which keeps
 * `err` but drops the `code` getter, so both places are read.
 */
function isOnlyDuplicateKeyErrors(error: unknown) {
  if (typeof error !== 'object' || error === null) return false

  const writeErrors = (error as { writeErrors?: InsertManyWriteError[] })
    .writeErrors

  if (!Array.isArray(writeErrors) || writeErrors.length === 0)
    return isDuplicateKeyError(error)

  return writeErrors.every(
    writeError => (writeError.code ?? writeError.err?.code) === 11000
  )
}

/**
 * Inserts the new candidates, tolerating a concurrent recompute that already
 * inserted some of them. The read-then-insert in the recompute has no lock, so
 * two overlapping attempts on one segment can both decide an item is missing.
 * The partial unique index on active items (see DictationReviewItemModel)
 * rejects the second copy with E11000; unordered, the rest still land, and
 * only the rows this call actually inserted are returned. Without that index
 * (not built yet) a race can still insert a duplicate, which the read path
 * tolerates - correctness never depends on the index existing.
 */
async function insertReviewCandidates(
  userId: string,
  candidates: ReviewCandidate[]
) {
  if (candidates.length === 0) return []

  const docs = candidates.map(candidate => ({
    userId,
    videoId: new Types.ObjectId(candidate.videoId),
    segmentId: new Types.ObjectId(candidate.segmentId),
    kind: candidate.kind,
    reason: candidate.reason,
    label: candidate.label,
    status: 'due',
    priority: candidate.priority,
    dueAt: candidate.dueAt,
    statsSnapshot: candidate.statsSnapshot,
  }))

  try {
    const createdItems = await DictationReviewItemModel.insertMany(docs, {
      ordered: false,
    })

    return createdItems.map(item =>
      toDictationReviewItemRecord(item.toObject())
    )
  } catch (error) {
    if (!isOnlyDuplicateKeyErrors(error)) throw error

    const insertedDocs =
      (error as { insertedDocs?: { toObject: () => unknown }[] })
        .insertedDocs ?? []

    return insertedDocs.map(item =>
      toDictationReviewItemRecord(
        item.toObject() as Parameters<typeof toDictationReviewItemRecord>[0]
      )
    )
  }
}

/**
 * Incremental recompute after one attempt: only the attempted segment's
 * attempts (served by the `{userId, segmentId, createdAt}` index), the segment
 * itself, and its active items. Idempotent, so it is safe to run again when
 * an attempt is replayed, including concurrently with the first delivery: a
 * lost race surfaces as E11000, which insertReviewCandidates tolerates.
 */
export async function recomputeReviewItemsForSegment({
  segmentId,
  userId,
  videoId,
}: {
  segmentId: string
  userId: string
  videoId: string
}) {
  const [attempts, segment, existingItems] = await Promise.all([
    DictationAttemptModel.find({
      userId,
      segmentId,
    })
      .sort({ createdAt: 1 })
      .lean(),
    DictationSegmentModel.findOne({
      _id: segmentId,
      videoId,
    }).lean(),
    // Active and closed items, as in the video-wide recompute.
    DictationReviewItemModel.find({
      userId,
      videoId,
      segmentId,
    }).lean(),
  ])

  return insertReviewCandidates(
    userId,
    selectNewReviewCandidates({
      attempts,
      existingItems,
      segments: segment ? [segment] : [],
    })
  )
}

export async function listDueReviewItemsForUser({
  limit = 20,
  userId,
  videoId,
}: {
  limit?: number
  // Null when the viewer has no practice identity yet - they own no review
  // items, so return nothing instead of querying with an empty owner.
  userId: string | null
  videoId?: string
}) {
  if (!userId) return []

  const query = {
    userId,
    ...(videoId ? { videoId } : {}),
    status: { $in: ACTIVE_REVIEW_STATUSES },
  }
  const items = await DictationReviewItemModel.find(query)
    .sort({ dueAt: 1, priority: -1, updatedAt: -1 })
    .limit(limit)
    .lean()

  return items.map(toDictationReviewItemRecord)
}

/** Every active review item of the user, uncapped (the list is capped). */
export async function countDueReviewItemsForUser(userId: string | null) {
  if (!userId) return 0

  return DictationReviewItemModel.countDocuments({
    userId,
    status: { $in: ACTIVE_REVIEW_STATUSES },
  })
}

/**
 * The learner solved this sentence from the review queue: every active item
 * of the segment is completed. The recompute then ignores the attempts made
 * up to now (see `selectNewReviewCandidates`), so the item stays gone until
 * the sentence is missed again.
 */
export async function completeReviewItemsForSegment({
  now = new Date(),
  segmentId,
  userId,
}: {
  now?: Date
  segmentId: string
  userId: string
}) {
  await DictationReviewItemModel.updateMany(
    { segmentId, status: { $in: ACTIVE_REVIEW_STATUSES }, userId },
    { $set: { lastReviewedAt: now, status: 'completed' } }
  )
}
