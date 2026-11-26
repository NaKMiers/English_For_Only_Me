import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/*
 * The words a learner can read before starting one IELTS test, shown under
 * the skill cards on /ielts/<slug>. Keyed by slug, not by test document, so
 * the list follows the test across versions. `entryIds` keeps the admin's
 * order (roughly the order the words appear in the test).
 */
const IeltsTestVocabSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true },
    entryIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'VocabEntry' }],
      default: [],
    },
    updatedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true, versionKey: false }
)

IeltsTestVocabSchema.index({ slug: 1 }, { unique: true })

export type IeltsTestVocabDocument = InferSchemaType<
  typeof IeltsTestVocabSchema
>

export const IeltsTestVocabModel =
  (models.IeltsTestVocab as Model<IeltsTestVocabDocument> | undefined) ??
  model<IeltsTestVocabDocument>('IeltsTestVocab', IeltsTestVocabSchema)
