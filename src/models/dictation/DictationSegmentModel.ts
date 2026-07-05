import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

const segmentQualityFlags = [
  'tooLong',
  'tooShort',
  'untimed',
  'partialTiming',
  'missingPunctuation',
  'likelyNonEnglish',
  'overlappingTiming',
  'largeGap',
  'duplicateText',
] as const

const DictationSegmentSchema = new Schema(
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
    transcriptSourceHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    normalizedText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    startMs: {
      type: Number,
      min: 0,
      default: null,
    },
    endMs: {
      type: Number,
      min: 0,
      default: null,
    },
    cueIndexes: {
      type: [Number],
      default: [],
    },
    qualityFlags: {
      type: [String],
      enum: segmentQualityFlags,
      default: [],
    },
    warningAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    attemptStatus: {
      type: String,
      enum: [
        'notStarted',
        'attemptedIncorrect',
        'correct',
        'revealed',
        'skipped',
      ],
      required: true,
      default: 'notStarted',
      index: true,
    },
    attemptCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

DictationSegmentSchema.index({ ownerId: 1, transcriptId: 1, order: 1 })
DictationSegmentSchema.index({ ownerId: 1, videoId: 1, order: 1 })

export type DictationSegmentDocument = InferSchemaType<
  typeof DictationSegmentSchema
>

export type DictationSegmentRecord = DictationSegmentApiRecord

export const DictationSegmentModel =
  (models.DictationSegment as Model<DictationSegmentDocument> | undefined) ??
  model<DictationSegmentDocument>('DictationSegment', DictationSegmentSchema)
