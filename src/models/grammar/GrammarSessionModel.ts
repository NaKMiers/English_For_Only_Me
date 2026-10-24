import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { GRAMMAR_SESSION_MODES } from '@/modules/grammar/constants'

/**
 * The idempotency record for one finished session. Inserted FIRST as a claim
 * (`response: null`) so concurrent requests with the same key cannot both
 * apply it; `response` is filled in once the writes land, and a retry with
 * the same key returns it instead of applying the session twice.
 */
const GrammarSessionSchema = new Schema(
  {
    userId: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true },
    mode: { type: String, enum: GRAMMAR_SESSION_MODES, required: true },
    targetId: { type: String, required: true, trim: true },
    claimedAt: { type: Date, required: true },
    response: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

GrammarSessionSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true })

export type GrammarSessionDocument = InferSchemaType<
  typeof GrammarSessionSchema
>

export const GrammarSessionModel =
  (models.GrammarSession as Model<GrammarSessionDocument>) ||
  model('GrammarSession', GrammarSessionSchema)
