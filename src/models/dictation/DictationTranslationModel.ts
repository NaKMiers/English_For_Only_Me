import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import type {
  DictationTranslationProvider,
  DictationTranslationStatus,
} from '@/modules/dictation/types'

const translationProviders: DictationTranslationProvider[] = ['none', 'openai']
const translationStatuses: DictationTranslationStatus[] = [
  'edited',
  'failed',
  'ready',
]

const DictationTranslationSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSegment',
      required: true,
      index: true,
    },
    targetLanguage: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sourceHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    text: {
      type: String,
      default: '',
      maxlength: 10_000,
    },
    provider: {
      type: String,
      enum: translationProviders,
      required: true,
      default: 'none',
    },
    status: {
      type: String,
      enum: translationStatuses,
      required: true,
      default: 'failed',
      index: true,
    },
    unavailableReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
)

DictationTranslationSchema.index(
  { ownerId: 1, segmentId: 1, targetLanguage: 1, sourceHash: 1 },
  { unique: true }
)

export type DictationTranslationDocument = InferSchemaType<
  typeof DictationTranslationSchema
>

export const DictationTranslationModel =
  (models.DictationTranslation as
    Model<DictationTranslationDocument> | undefined) ??
  model<DictationTranslationDocument>(
    'DictationTranslation',
    DictationTranslationSchema
  )
