import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import {
  GRAMMAR_ATTEMPT_ORIGINS,
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_DRILL_VERDICTS,
} from '@/modules/grammar/constants'

/**
 * One graded drill answer.
 *
 * Earns its keep twice: it is the history the streak and progress map are built
 * from, AND the mechanism that makes the answer route safe to retry.
 *
 * `idempotencyKey` follows the convention this repo already uses in two places
 * rather than inventing a third - see `VocabRecallAttemptModel.ts:45,97` with
 * `recallAnswerService.ts:57-70`, and `DictationAttemptModel.ts:184`. The client
 * mints the key when a drill is served; the answer route looks for a prior
 * attempt on (actorId, idempotencyKey) BEFORE mutating anything and returns the
 * original result if it finds one. Without that, a double-click or a network
 * retry applies the ladder twice, advancing two rungs for a single answer and
 * marking a stage-6 point mastered on one response.
 */
const GrammarDrillAttemptSchema = new Schema(
  {
    actorId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    pointSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    drillId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    kind: {
      type: String,
      enum: GRAMMAR_DRILL_KINDS,
      required: true,
    },
    verdict: {
      type: String,
      enum: GRAMMAR_DRILL_VERDICTS,
      required: true,
    },
    userAnswer: {
      type: String,
      default: null,
      trim: true,
      maxlength: 4000,
    },
    /** The accepted wording matched, or the closest one on a near miss. */
    matchedAnswer: {
      type: String,
      default: null,
      trim: true,
      maxlength: 4000,
    },
    /** wrong + missing + extra + spellingVariant against `matchedAnswer`. */
    score: {
      type: Number,
      default: null,
      min: 0,
    },
    /**
     * Ladder rung before and after this answer.
     *
     * `min` is 0, not 1, and 0 is a real value meaning THE POINT HAD NO LADDER
     * ROW. The on-demand test can ask about a rule the learner has never
     * touched, and under the wrong-answers-only rule a correct answer there
     * creates no `UserGrammarItem` at all - so there is no rung to record.
     * Writing 1/1 instead would assert a ladder position that never existed and
     * make those rows indistinguishable from real stage-1 answers.
     *
     *   correct + untouched   -> 0 / 0   (nothing created)
     *   wrong   + untouched   -> 0 / 1   (seeded onto the ladder)
     *   correct + at stage 4  -> 4 / 4   (test never promotes)
     *   wrong   + at stage 4  -> 4 / 1
     *
     * No backfill was needed: every row written before this change is 1 or
     * higher, so relaxing the floor cannot invalidate existing data.
     */
    stageBefore: {
      type: Number,
      required: true,
      min: 0,
      max: 7,
    },
    stageAfter: {
      type: Number,
      required: true,
      min: 0,
      max: 7,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    /**
     * Which flow produced this attempt.
     *
     * The diagnostic and the recall loop both write rows here and nothing used
     * to distinguish them, which matters for the correct-answer streak: the
     * diagnostic is a 40-question assessment seeded from `stageBefore: 1`, so a
     * lucky placement run would manufacture a ten-in-a-row compliment out of
     * questions the learner never studied for.
     *
     * Additive with a default, so nothing needs backfilling. But a Mongoose
     * default applies ON WRITE ONLY - it does not touch existing documents - so
     * every consumer must EXCLUDE 'diagnostic' rather than include 'recall',
     * or every pre-v2 attempt silently disappears from the count.
     */
    origin: {
      type: String,
      enum: GRAMMAR_ATTEMPT_ORIGINS,
      required: false,
      default: 'recall',
    },
  },
  { timestamps: true }
)

// Enforces idempotency in the database rather than hoping the UI prevents a
// second submit. This is the guarantee, not the UI.
GrammarDrillAttemptSchema.index(
  { actorId: 1, idempotencyKey: 1 },
  { unique: true }
)
// Serves the streak (distinct answer dates) and recent-activity queries.
GrammarDrillAttemptSchema.index({ actorId: 1, at: -1 })
GrammarDrillAttemptSchema.index({ actorId: 1, pointSlug: 1, at: -1 })

export type GrammarDrillAttemptDocument = InferSchemaType<
  typeof GrammarDrillAttemptSchema
>

export const GrammarDrillAttemptModel =
  (models.GrammarDrillAttempt as
    Model<GrammarDrillAttemptDocument> | undefined) ??
  model<GrammarDrillAttemptDocument>(
    'GrammarDrillAttempt',
    GrammarDrillAttemptSchema
  )
