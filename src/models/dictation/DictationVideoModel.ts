import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import type {
  DictationImportStatus,
  DictationTranscriptStatus,
  DictationVideoApiRecord,
  DictationVideoStatus,
} from '@/modules/dictation/types'

export type { DictationTranscriptStatus, DictationVideoStatus }

const DictationVideoSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['youtube'],
      required: true,
      default: 'youtube',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    youtubeUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    youtubeVideoId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    channelTitle: {
      type: String,
      trim: true,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: null,
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: null,
    },
    defaultLanguage: {
      type: String,
      trim: true,
      required: true,
      default: 'en',
    },
    purpose: {
      type: String,
      enum: ['ielts-listening', 'general-listening', 'shadowing'],
      required: true,
      default: 'ielts-listening',
    },
    status: {
      type: String,
      enum: [
        'draft',
        'needsTranscript',
        'transcriptReady',
        'segmenting',
        'ready',
        'inProgress',
        'completed',
        'failed',
        'archived',
      ],
      required: true,
      default: 'needsTranscript',
      index: true,
    },
    transcriptStatus: {
      type: String,
      enum: ['none', 'manualNeeded', 'manualAdded'],
      required: true,
      default: 'manualNeeded',
    },
    importStatus: {
      type: String,
      enum: [
        'draft',
        'metadataReady',
        'metadataWarning',
        'metadataReadyEmbedBlocked',
        'metadataFailed',
      ],
      required: true,
      default: 'draft',
    },
    importWarning: {
      type: String,
      trim: true,
      default: null,
    },
    activeTranscriptId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationTranscript',
      default: null,
    },
    sentenceCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    completedSessionCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    lastPracticedAt: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    collections: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

DictationVideoSchema.index({ ownerId: 1, createdAt: -1 })
DictationVideoSchema.index({ ownerId: 1, youtubeUrl: 1 }, { unique: true })
DictationVideoSchema.index(
  { ownerId: 1, youtubeVideoId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      youtubeVideoId: {
        $type: 'string',
      },
    },
  }
)

export type DictationVideoDocument = InferSchemaType<
  typeof DictationVideoSchema
>

export type DictationVideoRecord = DictationVideoApiRecord
export type { DictationImportStatus }

export const DictationVideoModel =
  (models.DictationVideo as Model<DictationVideoDocument> | undefined) ??
  model<DictationVideoDocument>('DictationVideo', DictationVideoSchema)
