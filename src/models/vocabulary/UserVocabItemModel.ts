import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import {
  VOCAB_KNOWN_REASONS,
  VOCAB_LEARNING_SOURCES,
  VOCAB_USER_ITEM_STATUSES,
} from '@/modules/vocabulary/constants'

const UserVocabItemSchema = new Schema(
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
    status: {
      type: String,
      enum: VOCAB_USER_ITEM_STATUSES,
      required: true,
      default: 'learning',
      index: true,
    },
    source: {
      type: String,
      enum: VOCAB_LEARNING_SOURCES,
      required: true,
      default: 'manual',
    },
    recallStage: {
      type: Number,
      min: 1,
      max: 7,
      required: true,
      default: 1,
    },
    dueAt: {
      type: Date,
      default: null,
      index: true,
    },
    reviewCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    correctCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    wrongCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    knownAt: {
      type: Date,
      default: null,
    },
    knownReason: {
      type: String,
      enum: VOCAB_KNOWN_REASONS,
      default: null,
    },
    masteredAt: {
      type: Date,
      default: null,
    },
    masteredReason: {
      type: String,
      enum: VOCAB_KNOWN_REASONS,
      default: null,
    },
    firstSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
)

// none -> learning stage 1 -> ... -> stage 7 -> mastered
// manual known is separate: none -> alreadyKnow, with no masteredAt timestamp.
UserVocabItemSchema.index({ userId: 1, vocabEntryId: 1 }, { unique: true })
UserVocabItemSchema.index({ userId: 1, status: 1, dueAt: 1 })
UserVocabItemSchema.index({ userId: 1, firstSeenAt: -1 })
UserVocabItemSchema.index({ userId: 1, updatedAt: -1 })

export type UserVocabItemDocument = InferSchemaType<typeof UserVocabItemSchema>

export const UserVocabItemModel =
  (models.UserVocabItem as Model<UserVocabItemDocument> | undefined) ??
  model<UserVocabItemDocument>('UserVocabItem', UserVocabItemSchema)
