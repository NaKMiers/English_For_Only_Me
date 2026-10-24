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
  DictationAttemptAction,
  DictationCorrectionTokenStatus,
} from '@/modules/dictation/types'

const attemptActions: DictationAttemptAction[] = ['check', 'reveal', 'skip']
const tokenStatuses: DictationCorrectionTokenStatus[] = [
  'correct',
  'extra',
  'missing',
  'spellingVariant',
  'wrong',
]

const DictationCorrectionTokenSchema = new Schema(
  {
    actual: {
      type: String,
      default: null,
    },
    actualOriginal: {
      type: String,
      default: null,
    },
    expected: {
      type: String,
      default: null,
    },
    expectedOriginal: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: tokenStatuses,
      required: true,
    },
  },
  {
    _id: false,
  }
)

const DictationAttemptSchema = new Schema(
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
    transcriptId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationTranscript',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSession',
      required: true,
      index: true,
    },
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSegment',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: attemptActions,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    typedAnswer: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    expectedTextSnapshot: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    replayCountDelta: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    timeSpentMs: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    normalizedTypedTokens: {
      type: [String],
      default: [],
    },
    normalizedExpectedTokens: {
      type: [String],
      default: [],
    },
    isPassed: {
      type: Boolean,
      required: true,
      index: true,
    },
    feedbackTokens: {
      type: [DictationCorrectionTokenSchema],
      default: [],
    },
    stats: {
      accuracy: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      correctCount: {
        type: Number,
        min: 0,
        required: true,
      },
      extraCount: {
        type: Number,
        min: 0,
        required: true,
      },
      missingCount: {
        type: Number,
        min: 0,
        required: true,
      },
      spellingVariantCount: {
        type: Number,
        min: 0,
        required: true,
      },
      totalExpected: {
        type: Number,
        min: 0,
        required: true,
      },
      wrongCount: {
        type: Number,
        min: 0,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
)

// Uniqueness is enforced per session (a stricter per-user unique index would
// fail to build on rows already recorded twice across sessions). The attempts
// route still treats a key as per user: it looks the key up with the
// non-unique `{userId, idempotencyKey}` index below before inserting, so a
// retry against a new session replays the original attempt.
DictationAttemptSchema.index(
  { userId: 1, sessionId: 1, idempotencyKey: 1 },
  { unique: true }
)
// Serves the per-user idempotency lookup. Until it is built the lookup still
// works through the unique index above (userId prefix, key filtered in the
// index), just with more keys examined.
DictationAttemptSchema.index({ userId: 1, idempotencyKey: 1 })
DictationAttemptSchema.index({ userId: 1, segmentId: 1, createdAt: -1 })
DictationAttemptSchema.index({ userId: 1, videoId: 1, createdAt: -1 })
// Global stats read one user's newest attempts (capped) for their tokens;
// none of the compound indexes above can serve a userId-only filter sorted by
// createdAt (walked backwards here).
DictationAttemptSchema.index({ userId: 1, createdAt: 1 })

export type DictationAttemptDocument = InferSchemaType<
  typeof DictationAttemptSchema
>

export const DictationAttemptModel =
  (models.DictationAttempt as Model<DictationAttemptDocument> | undefined) ??
  model<DictationAttemptDocument>('DictationAttempt', DictationAttemptSchema)
