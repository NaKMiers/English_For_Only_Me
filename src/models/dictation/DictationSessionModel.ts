import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import type { DictationSessionApiRecord } from '@/modules/dictation/types'

const DictationSessionSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
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

DictationSessionSchema.index({ ownerId: 1, videoId: 1, status: 1 })
DictationSessionSchema.index({ ownerId: 1, lastActiveAt: -1 })

export type DictationSessionDocument = InferSchemaType<
  typeof DictationSessionSchema
>

export type DictationSessionRecord = DictationSessionApiRecord

export const DictationSessionModel =
  (models.DictationSession as Model<DictationSessionDocument> | undefined) ??
  model<DictationSessionDocument>('DictationSession', DictationSessionSchema)
