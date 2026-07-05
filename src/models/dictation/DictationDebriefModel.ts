import 'server-only'

import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import type { DictationDebriefStatus } from '@/modules/dictation/types'

const debriefStatuses: DictationDebriefStatus[] = ['failed', 'pending', 'ready']

const DictationDebriefVocabularySchema = new Schema(
  {
    example: {
      type: String,
      required: true,
      maxlength: 240,
    },
    meaning: {
      type: String,
      required: true,
      maxlength: 240,
    },
    term: {
      type: String,
      required: true,
      maxlength: 80,
    },
  },
  {
    _id: false,
  }
)

const DictationDebriefSchema = new Schema(
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
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSession',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: debriefStatuses,
      required: true,
      default: 'pending',
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    promptVersion: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    inputSnapshotHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    contentSummary: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    keyVocabulary: {
      type: [DictationDebriefVocabularySchema],
      default: [],
    },
    listeningTraps: {
      type: [String],
      default: [],
    },
    weakPatterns: {
      type: [String],
      default: [],
    },
    nextActions: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    caveats: {
      type: [String],
      default: [],
    },
    failureReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    rawOutput: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

DictationDebriefSchema.index({
  ownerId: 1,
  videoId: 1,
  status: 1,
  createdAt: -1,
})
DictationDebriefSchema.index({
  ownerId: 1,
  videoId: 1,
  inputSnapshotHash: 1,
  status: 1,
})

export type DictationDebriefDocument = InferSchemaType<
  typeof DictationDebriefSchema
>

export const DictationDebriefModel =
  (models.DictationDebrief as Model<DictationDebriefDocument> | undefined) ??
  model<DictationDebriefDocument>('DictationDebrief', DictationDebriefSchema)
