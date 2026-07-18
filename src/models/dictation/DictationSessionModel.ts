import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { OWNER_KEY_PATTERN } from '@/lib/auth/ownerKey'
import type { DictationSessionApiRecord } from '@/modules/dictation/types'

const DictationSessionSchema = new Schema(
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
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      required: true,
      default: 'active',
      index: true,
    },
    currentSegmentId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSegment',
      default: null,
    },
    currentSegmentOrder: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    playbackSpeed: {
      type: Number,
      min: 0.25,
      max: 2,
      required: true,
      default: 1,
    },
    showShortcuts: {
      type: Boolean,
      required: true,
      default: true,
    },
    isVideoHidden: {
      type: Boolean,
      required: true,
      default: false,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

DictationSessionSchema.index({ userId: 1, videoId: 1, status: 1 })
DictationSessionSchema.index({ userId: 1, lastActiveAt: -1 })
// One in-flight session per user per video. Starting practice reuses the open
// session (or abandons strays) instead of stacking new ones, so "In Progress"
// counts real videos, not repeat visits. Partial so completed/abandoned rows
// (many per pair) are unconstrained. Requires clean data first: the repair
// migration dedupes pre-existing active sessions before this index builds.
DictationSessionSchema.index(
  { userId: 1, videoId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
)

export type DictationSessionDocument = InferSchemaType<
  typeof DictationSessionSchema
>

export type DictationSessionRecord = DictationSessionApiRecord

export const DictationSessionModel =
  (models.DictationSession as Model<DictationSessionDocument> | undefined) ??
  model<DictationSessionDocument>('DictationSession', DictationSessionSchema)
