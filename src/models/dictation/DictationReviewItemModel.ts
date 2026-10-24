import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { OWNER_KEY_PATTERN } from '@/lib/auth/ownerKey'
import type {
  DictationReviewItemKind,
  DictationReviewItemReason,
  DictationReviewItemStatus,
} from '@/modules/dictation/types'

const reviewKinds: DictationReviewItemKind[] = ['pattern', 'segment', 'word']
const reviewReasons: DictationReviewItemReason[] = [
  'highRetry',
  'lowAccuracy',
  'repeatedMistake',
  'revealed',
  'skipped',
]
const reviewStatuses: DictationReviewItemStatus[] = [
  'completed',
  'dismissed',
  'due',
  'scheduled',
]

const DictationReviewStatsSnapshotSchema = new Schema(
  {
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      default: 0,
    },
    attemptCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    lastAction: {
      type: String,
      enum: ['check', 'reveal', 'skip'],
      required: true,
      default: 'check',
    },
    mistakeTaxonomy: {
      extra: {
        type: Number,
        min: 0,
        required: true,
        default: 0,
      },
      missing: {
        type: Number,
        min: 0,
        required: true,
        default: 0,
      },
      spellingVariant: {
        type: Number,
        min: 0,
        required: true,
        default: 0,
      },
      wrong: {
        type: Number,
        min: 0,
        required: true,
        default: 0,
      },
    },
  },
  {
    _id: false,
  }
)

const DictationReviewItemSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      match: OWNER_KEY_PATTERN,
      index: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationVideo',
      required: true,
      index: true,
    },
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSegment',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: reviewKinds,
      required: true,
      default: 'segment',
    },
    reason: {
      type: String,
      enum: reviewReasons,
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: reviewStatuses,
      required: true,
      default: 'due',
      index: true,
    },
    priority: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      default: 50,
      index: true,
    },
    dueAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    statsSnapshot: {
      type: DictationReviewStatsSnapshotSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
)

DictationReviewItemSchema.index({
  userId: 1,
  status: 1,
  dueAt: 1,
  priority: -1,
})
DictationReviewItemSchema.index({ userId: 1, videoId: 1, status: 1 })
DictationReviewItemSchema.index({
  userId: 1,
  segmentId: 1,
  kind: 1,
  reason: 1,
})
// At most one ACTIVE item per (user, segment, kind, reason), so two
// overlapping recomputes cannot both insert the same item (the loser gets
// E11000, which insertReviewCandidates tolerates). Partial so completed and
// dismissed history (many per key) stays unconstrained. Built only by
// `bun run db:sync-indexes --apply`; production rows with duplicate active
// items must be deduped first or the build fails (the script reports it and
// carries on). `$in` in a partial filter needs MongoDB 6.0+.
DictationReviewItemSchema.index(
  // Same fields as the plain index above in another order, so the two never
  // share a key pattern (which MongoDB only allows under version-dependent
  // rules for partial indexes).
  { userId: 1, segmentId: 1, reason: 1, kind: 1 },
  {
    name: 'active_review_item_unique',
    unique: true,
    partialFilterExpression: { status: { $in: ['due', 'scheduled'] } },
  }
)

export type DictationReviewItemDocument = InferSchemaType<
  typeof DictationReviewItemSchema
>

export const DictationReviewItemModel =
  (models.DictationReviewItem as
    Model<DictationReviewItemDocument> | undefined) ??
  model<DictationReviewItemDocument>(
    'DictationReviewItem',
    DictationReviewItemSchema
  )
