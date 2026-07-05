import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import type { DictationTranscriptApiRecord } from '@/modules/dictation/types'

const DictationCueSchema = new Schema(
  {
    index: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
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
  },
  {
    _id: false,
  }
)

const DictationTranscriptSchema = new Schema(
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
    sourceType: {
      type: String,
      enum: [
        'manualText',
        'manualTimedText',
        'captionFile',
        'youtubeOwnedCaption',
      ],
      required: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: 'en',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    rawText: {
      type: String,
      required: true,
      maxlength: 500_000,
    },
    rawCues: {
      type: [DictationCueSchema],
      default: [],
    },
    sourceHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    qualityStatus: {
      type: String,
      enum: ['blocked', 'warning', 'ready'],
      required: true,
    },
    qualityFlags: {
      type: [String],
      default: [],
    },
    cueCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    segmentCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    createdBy: {
      type: String,
      enum: ['manual', 'import', 'system'],
      required: true,
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
)

DictationTranscriptSchema.index({ ownerId: 1, videoId: 1, isActive: 1 })
DictationTranscriptSchema.index(
  { ownerId: 1, videoId: 1, sourceHash: 1 },
  { unique: true }
)

export type DictationTranscriptDocument = InferSchemaType<
  typeof DictationTranscriptSchema
>

export type DictationTranscriptRecord = DictationTranscriptApiRecord

export const DictationTranscriptModel =
  (models.DictationTranscript as
    Model<DictationTranscriptDocument> | undefined) ??
  model<DictationTranscriptDocument>(
    'DictationTranscript',
    DictationTranscriptSchema
  )
