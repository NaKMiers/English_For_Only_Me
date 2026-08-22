import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_FAMILIES,
  GRAMMAR_L1_RISKS,
  GRAMMAR_TEST_MAX_QUESTIONS,
  GRAMMAR_TEST_SCOPES,
  GRAMMAR_TEST_SESSION_TTL_SECONDS,
} from '@/modules/grammar/constants'

/**
 * One question as stored, ANSWERS INCLUDED.
 *
 * This is why the collection exists. The client is served a projection of this
 * with `target`, `acceptedAnswers` and `explanation` stripped, and the answers
 * stay here until submit. The alternative - sending the answer key to the
 * browser and trusting it back - makes the score unfalsifiable and the ladder
 * writes meaningless, which is the same invariant `answerService.ts:50` states
 * for the recall route.
 *
 * A snapshot, not a reference. `target` and `acceptedAnswers` are copied rather
 * than looked up at submit time, because a generated question may never exist
 * as a stored drill (the append is capped and FIFO), and because content edited
 * mid-test must not change what the learner is graded against.
 */
const GrammarTestQuestionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    pointSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    pointTitle: { type: String, required: true, trim: true, maxlength: 300 },
    drillId: { type: String, required: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: GRAMMAR_DRILL_KINDS, required: true },
    prompt: { type: String, required: true, trim: true, maxlength: 2000 },
    choices: { type: [String], default: null },
    target: { type: String, required: true, trim: true, maxlength: 2000 },
    acceptedAnswers: { type: [String], default: [] },
    explanation: { type: String, required: true, trim: true, maxlength: 2000 },
    punctuationSensitive: { type: Boolean, required: true, default: false },
    generated: { type: Boolean, required: true, default: false },
    /**
     * The learner's ladder stage when the test was BUILT, not when it was
     * submitted. 0 means the point had no ladder row - see
     * `GrammarDrillAttemptModel`. Captured here so the attempt row can record an
     * honest before-and-after even though grading happens minutes later.
     */
    stageBefore: { type: Number, required: true, min: 0, max: 7, default: 0 },
  },
  { _id: false }
)

const GrammarTestConfigSchema = new Schema(
  {
    questionCount: {
      type: Number,
      required: true,
      min: 1,
      max: GRAMMAR_TEST_MAX_QUESTIONS,
    },
    scope: { type: String, enum: GRAMMAR_TEST_SCOPES, required: true },
    cefrLevels: { type: [String], enum: GRAMMAR_CEFR_LEVELS, default: [] },
    families: { type: [String], enum: GRAMMAR_FAMILIES, default: [] },
    complexities: {
      type: [Number],
      enum: GRAMMAR_COMPLEXITY_LEVELS,
      default: [],
    },
    l1Risks: { type: [String], enum: GRAMMAR_L1_RISKS, default: [] },
  },
  { _id: false }
)

/**
 * One on-demand test.
 *
 * A fourth grammar collection, and the only new one this feature needs. Drills
 * are embedded on their point because they are static and always fetched by
 * point; a test session is the opposite on both counts - it is per-learner
 * mutable state, and it spans many points at once, so it cannot be embedded on
 * any single one.
 *
 * Lifecycle:
 *
 *   created ──── status: 'open' ────┬── submit ──> 'submitted' (scored, kept)
 *                                   │
 *                                   └── 24h TTL ──> deleted
 *
 * `status` is the idempotency gate, and it is claimed with a conditional
 * `findOneAndUpdate` rather than checked and then written. A read-then-write
 * lets two submits 200ms apart both see 'open' and both reset the same points
 * to stage 1. See `testService.ts`.
 */
const GrammarTestSessionSchema = new Schema(
  {
    actorId: { type: String, required: true, trim: true, maxlength: 120 },
    config: { type: GrammarTestConfigSchema, required: true },
    questions: { type: [GrammarTestQuestionSchema], default: [] },
    status: {
      type: String,
      enum: ['open', 'submitted'],
      required: true,
      default: 'open',
    },
    submittedAt: { type: Date, default: null },
    /** Set once, at submit. Replayed verbatim when a duplicate submit loses. */
    score: {
      type: new Schema(
        {
          correct: { type: Number, required: true, min: 0 },
          total: { type: Number, required: true, min: 0 },
        },
        { _id: false }
      ),
      default: null,
    },
    /** Shortfall and generation failures, shown on the report. */
    notice: { type: String, default: null, trim: true, maxlength: 2000 },
    /** Cached so a replayed submit does not have to re-grade. */
    report: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

// "Your recent tests", and the daily-cap count.
GrammarTestSessionSchema.index({ actorId: 1, createdAt: -1 })
/**
 * Reaps abandoned tests only.
 *
 * Partial on `status: 'open'` so a submitted test survives as history - the
 * report is worth keeping, the unanswered shell is not. 24h is chosen so a test
 * abandoned before a meeting is still there afterwards.
 */
GrammarTestSessionSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: GRAMMAR_TEST_SESSION_TTL_SECONDS,
    partialFilterExpression: { status: 'open' },
  }
)

export type GrammarTestSessionDocument = InferSchemaType<
  typeof GrammarTestSessionSchema
>

export const GrammarTestSessionModel =
  (models.GrammarTestSession as
    Model<GrammarTestSessionDocument> | undefined) ??
  model<GrammarTestSessionDocument>(
    'GrammarTestSession',
    GrammarTestSessionSchema
  )
