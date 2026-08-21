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

/** A drill served to the client, with the answer stripped out. */
export interface GrammarRecallTaskRecord {
  cefrLevel: GrammarCefrLevel
  choices: string[] | null
  drillId: string
  /** Minted server-side per served drill; the client echoes it back on submit. */
  idempotencyKey: string
  kind: GrammarDrillKind
  l1Risk: GrammarL1Risk
  pointSlug: string
  pointTitle: string
  prompt: string
  recallStage: number
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
    mastered: number
    total: number
    touched: number
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
  id: string
  kind: GrammarDrillKind
  prompt: string
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

export interface GrammarContrastRecord {
  cefrLevel: GrammarCefrLevel
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

export interface GrammarPointListResult {
  page: number
  pageCount: number
  points: GrammarPointApiRecord[]
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
