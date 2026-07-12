import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { VOCAB_RECALL_TASK_TYPES } from '@/modules/vocabulary/constants'

const VocabRecallAttemptSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'UserVocabItem',
      required: true,
      index: true,
    },
    vocabEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'VocabEntry',
      required: true,
      index: true,
    },
    taskType: {
      type: String,
      enum: VOCAB_RECALL_TASK_TYPES,
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    selectedAnswer: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      index: true,
    },
    recallStageBefore: {
      type: Number,
      min: 1,
      max: 7,
      required: true,
    },
    recallStageAfter: {
      type: Number,
      min: 1,
      max: 7,
      required: true,
    },
    statusAfter: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    answeredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
)

VocabRecallAttemptSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true }
)
VocabRecallAttemptSchema.index({ userId: 1, answeredAt: -1 })
VocabRecallAttemptSchema.index({ userId: 1, taskType: 1, answeredAt: -1 })

export type VocabRecallAttemptDocument = InferSchemaType<
  typeof VocabRecallAttemptSchema
>

export const VocabRecallAttemptModel =
  (models.VocabRecallAttempt as
    Model<VocabRecallAttemptDocument> | undefined) ??
  model<VocabRecallAttemptDocument>(
    'VocabRecallAttempt',
    VocabRecallAttemptSchema
  )
