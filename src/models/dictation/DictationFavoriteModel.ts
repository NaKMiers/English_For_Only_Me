import 'server-only'

import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/**
 * Favorite: per-user star on a video. Keyed by the authenticated user's Mongo
 * ObjectId (userId) — NOT the content owner. The unique compound index makes
 * favoriting idempotent (one row per user+video).
 */
const DictationFavoriteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationVideo',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

DictationFavoriteSchema.index({ userId: 1, videoId: 1 }, { unique: true })

export type DictationFavoriteDocument = InferSchemaType<
  typeof DictationFavoriteSchema
>

export const DictationFavoriteModel =
  (models.DictationFavorite as Model<DictationFavoriteDocument> | undefined) ??
  model<DictationFavoriteDocument>('DictationFavorite', DictationFavoriteSchema)
