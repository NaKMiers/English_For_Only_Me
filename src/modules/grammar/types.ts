import type {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_DRILL_VERDICTS,
  GRAMMAR_FAMILIES,
  GRAMMAR_IELTS_IMPACTS,
  GRAMMAR_L1_RISKS,
  GRAMMAR_REVIEW_STATUSES,
  GRAMMAR_USER_ITEM_STATUSES,
} from './constants'

export type GrammarCefrLevel = (typeof GRAMMAR_CEFR_LEVELS)[number]
export type GrammarComplexity = (typeof GRAMMAR_COMPLEXITY_LEVELS)[number]
export type GrammarL1Risk = (typeof GRAMMAR_L1_RISKS)[number]
export type GrammarIeltsImpact = (typeof GRAMMAR_IELTS_IMPACTS)[number]
export type GrammarFamily = (typeof GRAMMAR_FAMILIES)[number]
export type GrammarDrillKind = (typeof GRAMMAR_DRILL_KINDS)[number]
export type GrammarReviewStatus = (typeof GRAMMAR_REVIEW_STATUSES)[number]
export type GrammarUserItemStatus = (typeof GRAMMAR_USER_ITEM_STATUSES)[number]
export type GrammarDrillVerdict = (typeof GRAMMAR_DRILL_VERDICTS)[number]

export interface UserGrammarItemApiRecord {
  correctCount: number
  dueAt: string | null
  lastReviewedAt: string | null
  masteredAt: string | null
  pointSlug: string
  recallStage: number
  reviewCount: number
  status: GrammarUserItemStatus
  wrongCount: number
}

/**
 * A drill served to the client, with the answer stripped out.
 *
 * Carries `family`, `complexity` and the observed risk so the drill can be
 * framed as a fight with the point's own creature rather than as a form. All
 * three are already on the document this is built from; none of them says
 * anything about the answer.
 */
export interface GrammarRecallTaskRecord {
  cefrLevel: GrammarCefrLevel
  choices: string[] | null
  complexity: GrammarComplexity
  drillId: string
  family: GrammarFamily
  /** Minted server-side per served drill; the client echoes it back on submit. */
  idempotencyKey: string
  kind: GrammarDrillKind
  l1Risk: GrammarL1Risk
  l1RiskObserved: GrammarL1Risk | null
  pointSlug: string
  pointTitle: string
  prompt: string
  recallStage: number
  reviewStatus: GrammarReviewStatus
}

export interface GrammarRecallAnswerResult {
  correction: {
    expected: string
    tokens: {
      actual: string | null
      expected: string | null
      status: string
    }[]
  } | null
  explanation: string
  isCorrect: boolean
  item: UserGrammarItemApiRecord
  matchedAnswer: string | null
  verdict: GrammarDrillVerdict
}

export interface GrammarStatsRecord {
  dueCount: number
  learningCount: number
  masteredCount: number
  reviewedTodayCount: number
  streakDays: number
  totalPoints: number
  /** One cell per `cefrLevel` x `complexity` pair for the competence heat map. */
  progressCells: {
    /** Mean ladder stage across touched points, or null if none are touched. */
    averageStage: number | null
    cefrLevel: GrammarCefrLevel
    complexity: GrammarComplexity
    /**
     * Points in this cell whose EFFECTIVE risk is high. Drives the danger
     * marking on the dungeon map, so the cell that actually hurts is visible
     * before the learner has touched anything in it.
     */
    dangerous: number
    mastered: number
    total: number
    touched: number
    /**
     * Points in this cell whose lesson no human has read. Drives the ghost
     * marking: a cell can be fully mastered and still be built on unchecked
     * content, and the map should not hide that.
     */
    unverified: number
  }[]
  untouchedCount: number
}

/**
 * One drill item. Lives as a subdocument on its grammar point rather than in
 * its own collection: drills are always fetched by point, the content is static,
 * and the relation is one-to-few (8-12 per point, ~15KB per document against a
 * 16MB limit). Matches MongoDB's stated default of preferring embedding.
 */
export interface GrammarDrillRecord {
  acceptedAnswers: string[]
  choices: string[] | null
  difficulty: 1 | 2 | 3
  explanation: string
  /**
   * Written by the on-demand test generator, never by `grammar:generate`.
   *
   * Marks a drill as AI-authored and unreviewed, which three readers must
   * respect or the generated pool quietly becomes the curriculum:
   *
   *   selectDrillForStage      - excludes these, so the daily recall queue
   *                              only ever serves reviewed content
   *   validateGrammarContent   - excludes these from the 8/12-drill floors,
   *                              so a point cannot meet its quality minimum
   *                              on machine output
   *   the drill array itself   - capped at GRAMMAR_MAX_GENERATED_DRILLS per
   *                              point, FIFO, because a subdocument budgeted
   *                              at 8-12 entries cannot absorb one per test
   *                              forever
   *
   * `grammar:export` is what promotes a survivor into committed content, which
   * makes promotion a human act rather than a side effect of taking a test.
   */
  generated?: boolean
  id: string
  kind: GrammarDrillKind
  prompt: string
  /**
   * Whether internal punctuation is part of the answer.
   *
   * Absent or false means the grader ignores commas, hyphens, quotes and
   * brackets (apostrophes always survive). True means compare as written,
   * which is right only where the mark carries the meaning being taught:
   * non-defining relative clauses, comma splices, tag questions, direct
   * speech.
   *
   * Absent on all 1800 pre-existing drills; `grammar:generate
   * --punctuation-flags` backfills the ones that need it.
   */
  punctuationSensitive?: boolean
  target: string
}

export interface GrammarExampleRecord {
  en: string
  note: string | null
  vi: string | null
}

export interface GrammarCommonMistakeRecord {
  right: string
  why: string
  wrong: string
}

/**
 * Two sentences that are BOTH correct but mean different things.
 *
 * Distinct from `GrammarCommonMistakeRecord` on purpose. A wrong/right pair
 * cannot express "stop to smoke" versus "stop smoking", because neither is
 * wrong - and forcing that contrast into a mistake pair produces a lesson that
 * contradicts its own explanation. Generated content did exactly that until
 * this type existed.
 */
export interface GrammarMinimalPairRecord {
  meaning: string
  sentence: string
}

/**
 * A taxonomy row before any lesson body has been generated. This is the shape
 * that is hand-authored and human-reviewed, and it is the contract every
 * generated lesson is written against.
 */
export interface GrammarTaxonomyRow {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  contrastsWith?: string[]
  family: GrammarFamily
  ieltsImpactOverride?: GrammarIeltsImpact | null
  l1Risk: GrammarL1Risk
  /**
   * The builder's own judgment of L1 difficulty, recorded after reading the
   * point. Absent until judged, which is what makes the 184-row pass resumable.
   *
   * Separate from `l1Risk` because `l1Risk` gates content requirements enforced
   * by `grammar:validate`. See `taxonomy/effectiveL1Risk.ts` for which field
   * each consumer must read.
   */
  l1RiskObserved?: GrammarL1Risk | null
  /**
   * Set only on a retired point. Published slugs are immutable, so a merge
   * leaves the old slug behind as a stub pointing at the survivor. This is what
   * keeps a learner's ladder position and history from being silently orphaned
   * when the taxonomy is refined.
   */
  mergedInto?: string | null
  order: number
  prerequisites?: string[]
  slug: string
  summary: string
  title: string
}

/**
 * The generated half of a point. Absent until `grammar:generate` has run for
 * this slug, which is why every consumer must handle the unenriched state.
 */
export interface GrammarLessonBody {
  commonMistakes: GrammarCommonMistakeRecord[]
  drills: GrammarDrillRecord[]
  examples: GrammarExampleRecord[]
  explanation: string
  /**
   * Vietnamese explanation, present only where `l1Risk` is high or
   * `complexity >= 4`.
   */
  explanationVi: string | null
  formPatterns: string[]
  l1Notes: string | null
  /**
   * Present only on points whose contrast is meaning-based rather than
   * correctness-based. Null or empty everywhere else.
   */
  minimalPairs: GrammarMinimalPairRecord[] | null
  reviewStatus: GrammarReviewStatus
  reviewedAt: string | null
}

export type GrammarContentFile = (GrammarTaxonomyRow &
  Partial<GrammarLessonBody>)[]

/** A point as returned by the API: taxonomy plus whatever body exists. */
export interface GrammarPointApiRecord extends GrammarTaxonomyRow {
  commonMistakes: GrammarCommonMistakeRecord[]
  drillCount: number
  examples: GrammarExampleRecord[]
  explanation: string | null
  explanationVi: string | null
  formPatterns: string[]
  /** Derived, never stored. See `taxonomy/ieltsImpact.ts`. */
  ieltsImpact: GrammarIeltsImpact
  id: string
  l1Notes: string | null
  minimalPairs: GrammarMinimalPairRecord[]
  reviewStatus: GrammarReviewStatus
  reviewedAt: string | null
}

/**
 * A lesson page's view of a point. `contrastsWith` here is the *resolved* union
 * of the point's own array and every point pointing back at it, because the
 * relation is symmetric but stored one-directionally.
 */
export interface GrammarLessonApiRecord extends GrammarPointApiRecord {
  contrasts: GrammarContrastRecord[]
}

/**
 * A rival point, as shown on a lesson page.
 *
 * Carries enough to DRAW the rival, not just to link to it: species comes from
 * `family`, menace from `complexity` plus the effective risk, and ghost state
 * from `reviewStatus`. The join that produces this already existed, so these
 * are projection fields rather than a new query.
 */
export interface GrammarContrastRecord {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  family: GrammarFamily
  l1Risk: GrammarL1Risk
  l1RiskObserved: GrammarL1Risk | null
  reviewStatus: GrammarReviewStatus
  slug: string
  summary: string
  title: string
}

export interface GrammarPointFilters {
  cefrLevel: GrammarCefrLevel | null
  family: GrammarFamily | null
  complexity: GrammarComplexity | null
  l1Risk: GrammarL1Risk | null
  reviewStatus: GrammarReviewStatus | null
  q: string | null
}

/**
 * A point's row in the learner's own ladder, or null when they have never
 * touched it.
 *
 * Attached by `listGrammarPoints` rather than living on the point, because it is
 * per-learner and the point document is shared. Optional so every existing
 * consumer of `GrammarPointApiRecord` compiles unchanged.
 */
export interface GrammarPointLearnerState {
  dueAt: string | null
  recallStage: number
  status: GrammarUserItemStatus
}

export interface GrammarPointListResult {
  page: number
  pageCount: number
  points: (GrammarPointApiRecord & {
    learner?: GrammarPointLearnerState | null
  })[]
  total: number
}

export interface GrammarValidationIssue {
  message: string
  rule: string
  slug: string | null
}

export interface GrammarValidationResult {
  checkedPoints: number
  issues: GrammarValidationIssue[]
  ok: boolean
}
