import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import {
  IELTS_GEN_STATUSES,
  IELTS_QUESTION_TYPES,
  IELTS_SECTION_KEYS,
  IELTS_SKILLS,
  IELTS_TEST_SOURCES,
  IELTS_TEST_STATUSES,
  IELTS_TRACKS,
} from '@/modules/ielts/constants'

/*
 * Shared, read-only content for learners. Mirrors src/modules/ielts/schema.ts
 * (the authority). Nothing per-learner is ever written here: attempts live in
 * IeltsAttemptModel.
 *
 * One document per test, edited in place in every status. Status is only
 * visibility:
 *
 *   draft --publish--> published --archive--> archived
 *                          ^                     |
 *                          +----- unarchive -----+
 *
 * Attempts point at slug + version; `version` stays 1 for new tests (older
 * data may still hold several versions of a slug). A partial unique index
 * keeps at most one published document per slug, so publishing archives any
 * other live one in the same transaction. Archived tests stay readable for
 * in-progress attempts and old reviews.
 */

const str = { type: String, default: '', trim: true }

const EvidenceSchema = new Schema(
  {
    quote: { type: String, required: true, trim: true },
    blockIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const QuestionSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1, max: 40 },
    prompt: str,
    answers: { type: [String], default: [] },
    evidence: { type: EvidenceSchema, default: null },
    explanation: str,
  },
  { _id: false }
)

const GroupSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    type: { type: String, enum: IELTS_QUESTION_TYPES, required: true },
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    instruction: str,
    wordLimit: {
      type: new Schema(
        { maxWords: Number, allowNumber: Boolean },
        { _id: false }
      ),
      default: null,
    },
    title: str,
    body: str,
    options: {
      type: [new Schema({ key: String, text: String }, { _id: false })],
      default: [],
    },
    correctKeys: { type: [String], default: [] },
    imageUrl: str,
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false }
)

const ListeningSchema = new Schema(
  {
    context: str,
    lines: {
      type: [
        new Schema(
          { speaker: String, voice: String, text: String },
          { _id: false }
        ),
      ],
      default: [],
    },
    audio: {
      type: new Schema(
        {
          url: String,
          publicId: String,
          durationSec: Number,
          lineOffsetsSec: { type: [Number], default: [] },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { _id: false }
)

const ReadingSchema = new Schema(
  {
    title: str,
    subtitle: str,
    paragraphs: {
      type: [new Schema({ label: String, text: String }, { _id: false })],
      default: [],
    },
  },
  { _id: false }
)

const WritingSchema = new Schema(
  {
    task: { type: Number, enum: [1, 2], required: true },
    prompt: str,
    minWords: { type: Number, required: true },
    // Chart data or an uploaded image; validated by the Zod schema on write.
    visual: { type: Schema.Types.Mixed, default: null },
    sampleAnswer: str,
  },
  { _id: false }
)

const SectionSchema = new Schema(
  {
    key: { type: String, enum: IELTS_SECTION_KEYS, required: true },
    skill: { type: String, enum: IELTS_SKILLS, required: true },
    order: { type: Number, required: true, min: 1, max: 4 },
    title: str,
    revision: { type: Number, default: 0 },
    genStatus: { type: String, enum: IELTS_GEN_STATUSES, default: 'manual' },
    genStartedAt: { type: Date, default: null },
    genError: str,
    /** Raw model output kept between a failed draft step and its repair. */
    genPending: { type: Schema.Types.Mixed, default: null },
    listening: { type: ListeningSchema, default: null },
    reading: { type: ReadingSchema, default: null },
    writing: { type: WritingSchema, default: null },
    groups: { type: [GroupSchema], default: [] },
  },
  { _id: false }
)

const GenerationLogSchema = new Schema(
  {
    at: { type: Date, required: true },
    sectionKey: str,
    kind: str,
    model: str,
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    outcome: { type: String, enum: ['ok', 'needsRepair', 'failed'] },
    failedRules: { type: [String], default: [] },
    error: str,
  },
  { _id: false }
)

const IeltsTestSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: IELTS_TEST_STATUSES, default: 'draft' },
    source: { type: String, enum: IELTS_TEST_SOURCES, default: 'manual' },
    title: { type: String, required: true, trim: true },
    series: str,
    track: { type: String, enum: IELTS_TRACKS, default: 'academic' },
    targetBand: { type: Number, default: 6.5 },
    tags: { type: [String], default: [] },
    description: str,
    /** Topic hints per section key, set when a test is generated. */
    plan: { type: Schema.Types.Mixed, default: null },
    createdBy: str,
    metaRevision: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    sections: { type: [SectionSchema], default: [] },
    generationLog: { type: [GenerationLogSchema], default: [] },
  },
  { timestamps: true }
)

IeltsTestSchema.index({ slug: 1, version: 1 }, { unique: true })
IeltsTestSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'published' },
    name: 'one_published_version_per_slug',
  }
)
IeltsTestSchema.index({ status: 1, updatedAt: -1 })

export type IeltsTestDocument = InferSchemaType<typeof IeltsTestSchema>

export const IeltsTestModel =
  (models.IeltsTest as Model<IeltsTestDocument> | undefined) ??
  model<IeltsTestDocument>('IeltsTest', IeltsTestSchema)
