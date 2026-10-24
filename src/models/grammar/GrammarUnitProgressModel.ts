import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/** One row per (learner, unit) once its checkpoint or a test-out is passed. */
const GrammarUnitProgressSchema = new Schema(
  {
    userId: { type: String, required: true, trim: true },
    unitId: { type: String, required: true, trim: true },
    completedAt: { type: Date, required: true },
    passedBy: { type: String, enum: ['checkpoint', 'test'], required: true },
  },
  { timestamps: true }
)

GrammarUnitProgressSchema.index({ userId: 1, unitId: 1 }, { unique: true })

export type GrammarUnitProgressDocument = InferSchemaType<
  typeof GrammarUnitProgressSchema
>

export const GrammarUnitProgressModel =
  (models.GrammarUnitProgress as Model<GrammarUnitProgressDocument>) ||
  model('GrammarUnitProgress', GrammarUnitProgressSchema)
