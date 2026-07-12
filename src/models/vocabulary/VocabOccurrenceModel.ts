import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { VOCAB_OCCURRENCE_REASONS } from '@/modules/vocabulary/constants'

const VocabOccurrenceSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    vocabEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'VocabEntry',
      required: true,
      index: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationVideo',
      default: null,
      index: true,
    },
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationSegment',
      default: null,
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationAttempt',
      default: null,
      index: true,
    },
    contextSentence: {
      type: String,
      default: null,
      trim: true,
      maxlength: 3000,
    },
    selectedText: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    reason: {
      type: String,
      enum: VOCAB_OCCURRENCE_REASONS,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
)

VocabOccurrenceSchema.index({ userId: 1, vocabEntryId: 1, createdAt: -1 })
VocabOccurrenceSchema.index({ userId: 1, reason: 1, createdAt: -1 })

export type VocabOccurrenceDocument = InferSchemaType<
  typeof VocabOccurrenceSchema
>

export const VocabOccurrenceModel =
  (models.VocabOccurrence as Model<VocabOccurrenceDocument> | undefined) ??
  model<VocabOccurrenceDocument>('VocabOccurrence', VocabOccurrenceSchema)
