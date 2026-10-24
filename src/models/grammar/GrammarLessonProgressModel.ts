import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/**
 * One row per (learner, lesson). Content lives in code; this row only says how
 * far the learner got. `recallStage` stays null for lessons passed by a
 * test-out until they are played as a lesson (see planGrammarSessionWrite).
 */
const GrammarLessonProgressSchema = new Schema(
  {
    userId: { type: String, required: true, trim: true },
    lessonId: { type: String, required: true, trim: true },
    stars: { type: Number, min: 0, max: 3, required: true, default: 0 },
    bestAccuracy: { type: Number, min: 0, max: 1, required: true, default: 0 },
    passedBy: { type: String, enum: ['lesson', 'test'], default: null },
    completedAt: { type: Date, default: null },
    attempts: { type: Number, min: 0, required: true, default: 0 },
    recallStage: { type: Number, min: 1, max: 7, default: null },
    dueAt: { type: Date, default: null },
    reviewCount: { type: Number, min: 0, required: true, default: 0 },
    correctCount: { type: Number, min: 0, required: true, default: 0 },
    wrongCount: { type: Number, min: 0, required: true, default: 0 },
    masteredAt: { type: Date, default: null },
  },
  { timestamps: true }
)

GrammarLessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })

export type GrammarLessonProgressDocument = InferSchemaType<
  typeof GrammarLessonProgressSchema
>

export const GrammarLessonProgressModel =
  (models.GrammarLessonProgress as Model<GrammarLessonProgressDocument>) ||
  model('GrammarLessonProgress', GrammarLessonProgressSchema)
