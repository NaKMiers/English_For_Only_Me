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
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_FAMILIES,
  GRAMMAR_IELTS_IMPACTS,
  GRAMMAR_L1_RISKS,
  GRAMMAR_REVIEW_STATUSES,
} from '@/modules/grammar/constants'

/**
 * Drills are embedded on their point rather than living in their own
 * collection: they are always fetched by point, the content is static, and the
 * relation is one-to-few (8-12 per point, roughly 15KB per document against a
 * 16MB limit). Matches MongoDB's documented default of preferring embedding,
 * and keeps the module at three collections instead of four.
 */
const GrammarDrillSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    kind: {
      type: String,
      enum: GRAMMAR_DRILL_KINDS,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    choices: {
      type: [String],
      default: null,
    },
    target: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    /**
     * Every wording accepted as correct. For production drill kinds this is
     * where contraction variants live, because the grammar grader deliberately
     * disables the dictation normalizer's contraction expansion - that
     * expansion maps "he's" to "he is" and "he'd" to "he would", which corrupts
     * present perfect and past perfect. The author decides which readings are
     * valid, not a lookup table.
     *
     * Hand-accepted additions arrive through the admin accept-answer action and
     * are carried back into the committed JSON by `grammar:export`.
     */
    acceptedAnswers: {
      type: [String],
      default: [],
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    difficulty: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      default: 1,
    },
  },
  { _id: false }
)

const GrammarExampleSchema = new Schema(
  {
    en: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    vi: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false }
)

const GrammarCommonMistakeSchema = new Schema(
  {
    wrong: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    right: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    why: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { _id: false }
)

/**
 * A minimal pair: one correct sentence plus what it means.
 *
 * Separate from the common-mistake subschema because these sentences are not
 * mistakes. See `GrammarMinimalPairRecord`.
 */
const GrammarMinimalPairSchema = new Schema(
  {
    sentence: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    meaning: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { _id: false }
)

const GrammarPointSchema = new Schema(
  {
    // --- Taxonomy: hand-authored, human-reviewed, immutable slug ---
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    family: {
      type: String,
      enum: GRAMMAR_FAMILIES,
      required: true,
    },
    /** When a learner meets this rule. Independent of `complexity`. */
    cefrLevel: {
      type: String,
      enum: GRAMMAR_CEFR_LEVELS,
      required: true,
    },
    /**
     * How hard the rule is to get right, 1-5. Deliberately independent of
     * `cefrLevel`: articles are A1 and complexity 5, future perfect continuous
     * is C1 and complexity 3. Collapsing these two into one ordering is the
     * mistake every published grammar syllabus makes.
     */
    complexity: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
    /**
     * Vietnamese L1 transfer difficulty. The axis a generic curriculum cannot
     * provide. Drives the browse sort, the drill minimum, and whether a
     * Vietnamese explanation is generated.
     */
    l1Risk: {
      type: String,
      enum: GRAMMAR_L1_RISKS,
      required: true,
    },
    /**
     * Sortable form of `l1Risk` (low 1, medium 2, high 3), written at seed time.
     *
     * Mongo sorts strings lexicographically, so a descending sort on `l1Risk`
     * itself returns medium > low > high and buries the highest-risk points.
     * Verified against the real database, not assumed.
     */
    l1RiskRank: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      default: 2,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    /** Authored one-directionally; the reverse is derived at read time. */
    contrastsWith: {
      type: [String],
      default: [],
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    /**
     * Set only on a retired point. Published slugs are immutable, so a merge
     * leaves the old slug as a stub pointing at the survivor and learner
     * progress follows the redirect instead of being orphaned.
     */
    mergedInto: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    /** Overrides the derived `ieltsImpact`. Normally null. */
    ieltsImpactOverride: {
      type: String,
      enum: [...GRAMMAR_IELTS_IMPACTS, null],
      default: null,
    },

    // --- Body: AI-generated at authoring time, gated by grammar:validate ---
    explanation: {
      type: String,
      default: null,
      trim: true,
      maxlength: 20000,
    },
    /** Present only where `l1Risk` is high or `complexity >= 4`. */
    explanationVi: {
      type: String,
      default: null,
      trim: true,
      maxlength: 20000,
    },
    formPatterns: {
      type: [String],
      default: [],
    },
    examples: {
      type: [GrammarExampleSchema],
      default: [],
    },
    commonMistakes: {
      type: [GrammarCommonMistakeSchema],
      default: [],
    },
    minimalPairs: {
      type: [GrammarMinimalPairSchema],
      default: [],
    },
    l1Notes: {
      type: String,
      default: null,
      trim: true,
      maxlength: 10000,
    },
    drills: {
      type: [GrammarDrillSchema],
      default: [],
    },
    /**
     * Gates a visible banner on the lesson page. An unreviewed AI-written
     * grammar explanation is exactly the thing you must not study from without
     * knowing it is unreviewed.
     */
    reviewStatus: {
      type: String,
      enum: GRAMMAR_REVIEW_STATUSES,
      required: true,
      default: 'unverified',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    seedSource: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
)

GrammarPointSchema.index({ slug: 1 }, { unique: true })
// Browse filters.
GrammarPointSchema.index({ cefrLevel: 1 })
GrammarPointSchema.index({ family: 1, order: 1 })
GrammarPointSchema.index({ l1Risk: 1 })
// Serves the default browse sort, which surfaces the points this learner is
// most likely to get wrong: high L1 risk, then hardest, then earliest level.
// Sorts on the numeric rank, not the string enum.
GrammarPointSchema.index({ l1RiskRank: -1, complexity: -1, cefrLevel: 1 })
// `contrastsWith` is stored one-directionally, so the lesson page derives the
// reverse with an array query. Without this index that is a collection scan on
// every lesson load.
GrammarPointSchema.index({ contrastsWith: 1 })
// Admin review queue: unreviewed points, hardest-transfer first.
GrammarPointSchema.index({ reviewStatus: 1, l1Risk: 1 })
GrammarPointSchema.index({ title: 'text', summary: 'text' })

export type GrammarPointDocument = InferSchemaType<typeof GrammarPointSchema>

export const GrammarPointModel =
  (models.GrammarPoint as Model<GrammarPointDocument> | undefined) ??
  model<GrammarPointDocument>('GrammarPoint', GrammarPointSchema)
