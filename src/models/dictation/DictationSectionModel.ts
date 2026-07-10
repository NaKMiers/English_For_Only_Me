import 'server-only'

import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/**
 * Section: middle of the content hierarchy, always belongs to a Topic. Videos
 * reference a section optionally (a topic video with no section falls back to
 * an "Ungrouped" bucket at render time).
 */
const DictationSectionSchema = new Schema(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'DictationTopic',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

DictationSectionSchema.index({ topicId: 1, order: 1 })

export type DictationSectionDocument = InferSchemaType<
  typeof DictationSectionSchema
>

export const DictationSectionModel =
  (models.DictationSection as Model<DictationSectionDocument> | undefined) ??
  model<DictationSectionDocument>('DictationSection', DictationSectionSchema)
