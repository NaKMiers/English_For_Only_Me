import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import {
  VOCAB_ENTRY_ENRICHMENT_STATUSES,
  VOCAB_ENTRY_TYPES,
} from '@/modules/vocabulary/constants'

const VocabPhoneticSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
)

const VocabAudioUrlSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    accent: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    license: {
      type: String,
      default: null,
      trim: true,
      maxlength: 240,
    },
  },
  { _id: false }
)

const VocabDefinitionSchema = new Schema(
  {
    partOfSpeech: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    definition: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    example: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    synonyms: {
      type: [String],
      default: [],
    },
    antonyms: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
)

const VocabLocalizedMeaningSchema = new Schema(
  {
    language: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 16,
    },
    meaning: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    partOfSpeech: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    license: {
      type: String,
      default: null,
      trim: true,
      maxlength: 240,
    },
  },
  { _id: false }
)

const VocabExampleSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
)

const VocabRelatedWordSchema = new Schema(
  {
    term: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    relation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
)

const VocabSourceAttributionSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    license: {
      type: String,
      default: null,
      trim: true,
      maxlength: 240,
    },
    retrievedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
)

const VocabLicenseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    attributionRequired: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false }
)

const VocabProviderErrorSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
)

const VocabEntrySchema = new Schema(
  {
    language: {
      type: String,
      required: true,
      default: 'en',
      lowercase: true,
      trim: true,
      maxlength: 16,
      index: true,
    },
    term: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    normalizedTerm: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },
    entryType: {
      type: String,
      enum: VOCAB_ENTRY_TYPES,
      required: true,
      default: 'word',
    },
    lemma: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    partOfSpeech: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    frequencyRank: {
      type: Number,
      min: 1,
      default: null,
      index: true,
    },
    difficultyLevel: {
      type: String,
      default: null,
      trim: true,
      maxlength: 80,
    },
    phonetics: {
      type: [VocabPhoneticSchema],
      default: [],
    },
    audioUrls: {
      type: [VocabAudioUrlSchema],
      default: [],
    },
    definitions: {
      type: [VocabDefinitionSchema],
      default: [],
    },
    localizedMeanings: {
      type: [VocabLocalizedMeaningSchema],
      default: [],
    },
    examples: {
      type: [VocabExampleSchema],
      default: [],
    },
    synonyms: {
      type: [String],
      default: [],
    },
    antonyms: {
      type: [String],
      default: [],
    },
    relatedWords: {
      type: [VocabRelatedWordSchema],
      default: [],
    },
    sourceAttributions: {
      type: [VocabSourceAttributionSchema],
      default: [],
    },
    license: {
      type: VocabLicenseSchema,
      default: null,
    },
    rawProviderData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => ({}),
    },
    enrichmentStatus: {
      type: String,
      enum: VOCAB_ENTRY_ENRICHMENT_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    enrichmentAttempts: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    lastEnrichedAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    providerErrors: {
      type: [VocabProviderErrorSchema],
      default: [],
    },
    enrichmentLockId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
      index: true,
    },
    enrichmentLockedAt: {
      type: Date,
      default: null,
    },
    enrichmentLeaseExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    seedSource: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    seedRank: {
      type: Number,
      min: 1,
      default: null,
    },
    seedLicense: {
      type: String,
      default: null,
      trim: true,
      maxlength: 240,
    },
  },
  { timestamps: true }
)

VocabEntrySchema.index({ language: 1, normalizedTerm: 1 }, { unique: true })
VocabEntrySchema.index({
  enrichmentStatus: 1,
  nextRetryAt: 1,
  frequencyRank: 1,
})
VocabEntrySchema.index({ enrichmentLeaseExpiresAt: 1, enrichmentStatus: 1 })
VocabEntrySchema.index({ language: 1, frequencyRank: 1 })
// Serves the recall/explore browse queries that sort a large "ready" slice by
// { frequencyRank, normalizedTerm }. Without an index covering the full sort
// key, MongoDB does a blocking in-memory sort that throws once the collection
// grows past the sort memory cap (32MB find / 100MB aggregate) - which is why
// /api/vocab/recall/due and /api/vocab/explore 500 in production but not locally.
VocabEntrySchema.index({
  enrichmentStatus: 1,
  frequencyRank: 1,
  normalizedTerm: 1,
})
VocabEntrySchema.index({ term: 'text', normalizedTerm: 'text', lemma: 'text' })

export type VocabEntryDocument = InferSchemaType<typeof VocabEntrySchema>

export const VocabEntryModel =
  (models.VocabEntry as Model<VocabEntryDocument> | undefined) ??
  model<VocabEntryDocument>('VocabEntry', VocabEntrySchema)
