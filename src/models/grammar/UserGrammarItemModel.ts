import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { GRAMMAR_USER_ITEM_STATUSES } from '@/modules/grammar/constants'

/**
 * Per-learner state for one grammar point.
 *
 * Mirrors `UserVocabItemModel` field for field so the shared recall ladder in
 * `modules/learning` can operate on either shape.
 *
 * There is deliberately NO `new` status. Rows are created lazily on the
 * learner's first interaction (findOneAndUpdate + upsert), and the browse list
 * left-joins, so an untouched point renders as untouched without minting 162
 * rows on a first visit.
 *
 * Keyed by `pointSlug` rather than an ObjectId because content is seeded from
 * committed JSON. That is safe only because published slugs are immutable: a
 * retired point keeps a `mergedInto` stub and lookups follow the redirect, so a
 * taxonomy merge never orphans the ladder position recorded here.
 */
const UserGrammarItemSchema = new Schema(
  {
    actorId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    pointSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: GRAMMAR_USER_ITEM_STATUSES,
      required: true,
      default: 'learning',
    },
    recallStage: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7],
      required: true,
      default: 1,
    },
    dueAt: {
      type: Date,
      default: null,
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
    reviewCount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    masteredAt: {
      type: Date,
      default: null,
    },
    masteredReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    knownAt: {
      type: Date,
      default: null,
    },
    knownReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
  },
  { timestamps: true }
)

UserGrammarItemSchema.index({ actorId: 1, pointSlug: 1 }, { unique: true })
// Serves the due queue.
UserGrammarItemSchema.index({ actorId: 1, dueAt: 1 })
UserGrammarItemSchema.index({ actorId: 1, status: 1 })

export type UserGrammarItemDocument = InferSchemaType<
  typeof UserGrammarItemSchema
>

export const UserGrammarItemModel =
  (models.UserGrammarItem as Model<UserGrammarItemDocument> | undefined) ??
  model<UserGrammarItemDocument>('UserGrammarItem', UserGrammarItemSchema)
