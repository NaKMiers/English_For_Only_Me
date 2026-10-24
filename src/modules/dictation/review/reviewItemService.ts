import 'server-only'

import { Types } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'
import {
  buildReviewCandidates,
  getReviewActionStatus,
  type ReviewCandidate,
} from '@/modules/dictation/review/reviewScheduler'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import type { DictationReviewItemStatus } from '@/modules/dictation/types'

const ACTIVE_REVIEW_STATUSES: DictationReviewItemStatus[] = ['due', 'scheduled']

type ReviewAttemptInput = Parameters<typeof toDictationAttemptRecord>[0]
type ReviewSegmentInput = Parameters<typeof toDictationSegmentRecord>[0]

interface ExistingReviewItemKey {
  kind: string
  reason: string
  segmentId: unknown
}

/**
 * The review candidates that do not already have an active item. Shared by the
 * video-wide and the segment-scoped recompute so both decide identically:
 * buildReviewCandidates groups by segment, so feeding it one segment's attempts
 * yields exactly that segment's share of the video-wide result.
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
    existingItems.map(
      item => `${String(item.segmentId)}:${item.kind}:${item.reason}`
    )
  )

  return buildReviewCandidates({
    attempts: attempts.map(toDictationAttemptRecord),
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

export async function recomputeReviewItemsForVideo({
  userId,
  videoId,
}: {
  userId: string
  videoId: string
}) {
  const [attempts, segments, existingItems] = await Promise.all([
    DictationAttemptModel.find({
      userId,
      videoId,
    })
      .sort({ createdAt: 1 })
      .lean(),
    DictationSegmentModel.find({
      videoId,
    })
      .sort({ order: 1 })
      .lean(),
    DictationReviewItemModel.find({
      userId,
      videoId,
      status: { $in: ACTIVE_REVIEW_STATUSES },
    }).lean(),
  ])

  return insertReviewCandidates(
    userId,
    selectNewReviewCandidates({ attempts, existingItems, segments })
  )
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
    DictationReviewItemModel.find({
      userId,
      videoId,
      segmentId,
      status: { $in: ACTIVE_REVIEW_STATUSES },
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

export async function markReviewItemForUser({
  action,
  userId,
  reviewItemId,
}: {
  action: 'complete' | 'dismiss'
  userId: string
  reviewItemId: string
}) {
  const now = new Date()
  const item = await DictationReviewItemModel.findOneAndUpdate(
    {
      _id: reviewItemId,
      userId,
    },
    {
      $set: {
        lastReviewedAt: now,
        status: getReviewActionStatus(action),
      },
    },
    {
      returnDocument: 'after',
    }
  )

  return item ? toDictationReviewItemRecord(item.toObject()) : null
}
