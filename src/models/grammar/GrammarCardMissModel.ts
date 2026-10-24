import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/**
 * A practice card the learner got wrong on the first try. Open while
 * `clearedAt` is null; "Luyện điểm yếu" serves open rows and clears them.
 */
const GrammarCardMissSchema = new Schema(
  {
    userId: { type: String, required: true, trim: true },
    cardId: { type: String, required: true, trim: true },
    lessonId: { type: String, required: true, trim: true },
    missCount: { type: Number, min: 1, required: true, default: 1 },
    lastMissedAt: { type: Date, required: true },
    clearedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

GrammarCardMissSchema.index({ userId: 1, cardId: 1 }, { unique: true })

export type GrammarCardMissDocument = InferSchemaType<
  typeof GrammarCardMissSchema
>

export const GrammarCardMissModel =
  (models.GrammarCardMiss as Model<GrammarCardMissDocument>) ||
  model('GrammarCardMiss', GrammarCardMissSchema)
