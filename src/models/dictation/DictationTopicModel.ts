import 'server-only'

import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/**
 * Topic: top of the shared content hierarchy (Topic > Section > Video).
 * Global content (admin-curated), NOT per-user. Level range, section count, and
 * lesson count are derived by aggregation (see topicAggregates), not stored.
 */
const DictationTopicSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: null,
    },
    hasVideoMedia: {
      type: Boolean,
      required: true,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

export type DictationTopicDocument = InferSchemaType<
  typeof DictationTopicSchema
>

export const DictationTopicModel =
  (models.DictationTopic as Model<DictationTopicDocument> | undefined) ??
  model<DictationTopicDocument>('DictationTopic', DictationTopicSchema)
