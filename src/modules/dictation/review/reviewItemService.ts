import 'server-only'

import { Types } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import {
  buildReviewCandidates,
  getReviewActionStatus,
} from '@/modules/dictation/review/reviewScheduler'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import type { DictationReviewItemStatus } from '@/modules/dictation/types'

const ACTIVE_REVIEW_STATUSES: DictationReviewItemStatus[] = ['due', 'scheduled']

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
  const existingKeys = new Set(
    existingItems.map(
      item => `${String(item.segmentId)}:${item.kind}:${item.reason}`
    )
  )
  const candidates = buildReviewCandidates({
    attempts: attempts.map(toDictationAttemptRecord),
    segments: segments.map(toDictationSegmentRecord),
  }).filter(
    candidate =>
      !existingKeys.has(
        `${candidate.segmentId}:${candidate.kind}:${candidate.reason}`
      )
  )

  if (candidates.length === 0) return []

  const createdItems = await DictationReviewItemModel.insertMany(
    candidates.map(candidate => ({
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
    })),
    {
      ordered: false,
    }
  )

  return createdItems.map(item => toDictationReviewItemRecord(item.toObject()))
}

export async function listDueReviewItemsForUser({
  limit = 20,
  userId,
  videoId,
}: {
  limit?: number
  userId: string
  videoId?: string
}) {
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
      new: true,
    }
  )

  return item ? toDictationReviewItemRecord(item.toObject()) : null
}
