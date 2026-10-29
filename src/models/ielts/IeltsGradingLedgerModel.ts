import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/*
 * AI writing gradings that outlived their attempt. The daily grading cap
 * counts `gradings.at` inside attempts; when a learner deletes an attempt,
 * its gradings from today move here so deleting cannot reset the cap. Rows
 * expire on their own after two days (the cap only looks at today, UTC).
 */
const IeltsGradingLedgerSchema = new Schema(
  {
    ownerId: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
  },
  { versionKey: false }
)

IeltsGradingLedgerSchema.index({ ownerId: 1, at: 1 })
IeltsGradingLedgerSchema.index({ at: 1 }, { expireAfterSeconds: 2 * 86_400 })

export type IeltsGradingLedgerDocument = InferSchemaType<
  typeof IeltsGradingLedgerSchema
>

export const IeltsGradingLedgerModel =
  (models.IeltsGradingLedger as
    Model<IeltsGradingLedgerDocument> | undefined) ??
  model<IeltsGradingLedgerDocument>(
    'IeltsGradingLedger',
    IeltsGradingLedgerSchema
  )
