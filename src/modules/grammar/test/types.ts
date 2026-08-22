import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarDrillKind,
  GrammarFamily,
  GrammarL1Risk,
  GrammarReviewStatus,
  GrammarUserItemStatus,
} from '@/modules/grammar/types'

import type { GRAMMAR_TEST_SCOPES } from '../constants'

export type GrammarTestScope = (typeof GRAMMAR_TEST_SCOPES)[number]

/**
 * What the learner asked for.
 *
 * Every array is "no constraint when empty", never "match nothing". The scope
 * is the one axis with an opinionated default.
 */
export interface GrammarTestConfig {
  cefrLevels: GrammarCefrLevel[]
  complexities: GrammarComplexity[]
  families: GrammarFamily[]
  l1Risks: GrammarL1Risk[]
  questionCount: number
  scope: GrammarTestScope
}

/**
 * A point the test may draw a question from, with everything the generator and
 * the grader need and nothing they do not.
 */
export interface GrammarTestCandidate {
  cefrLevel: GrammarCefrLevel
  commonMistakes: { right: string; why: string; wrong: string }[]
  complexity: GrammarComplexity
  drills: import('@/modules/grammar/types').GrammarDrillRecord[]
  family: GrammarFamily
  formPatterns: string[]
  l1Risk: GrammarL1Risk
  l1RiskObserved: GrammarL1Risk | null
  reviewStatus: GrammarReviewStatus
  slug: string
  /** Absent when the learner has never touched this point. */
  status: GrammarUserItemStatus | null
  summary: string
  title: string
}

/**
 * One stored question. Lives on the session document, answers included, and is
 * never returned to the client in this shape.
 */
export interface GrammarTestQuestionRecord {
  acceptedAnswers: string[]
  choices: string[] | null
  /** Set when the question came from OpenAI rather than the stored pool. */
  generated: boolean
  /** The stored drill this came from, or the minted id of a generated one. */
  drillId: string
  explanation: string
  id: string
  kind: GrammarDrillKind
  pointSlug: string
  pointTitle: string
  prompt: string
  punctuationSensitive: boolean
  /** The learner's ladder stage when the test was built. 0 = no ladder row. */
  stageBefore: number
  target: string
}

/** The same question with every answer stripped out, safe to serve. */
export interface GrammarTestQuestionApiRecord {
  cefrLevel: GrammarCefrLevel
  choices: string[] | null
  generated: boolean
  id: string
  kind: GrammarDrillKind
  l1Risk: GrammarL1Risk
  pointSlug: string
  pointTitle: string
  prompt: string
  reviewStatus: GrammarReviewStatus
}

export interface GrammarTestStartResult {
  /** Named so the report can say what the learner did not get, and why. */
  notice: string | null
  questions: GrammarTestQuestionApiRecord[]
  sessionId: string
}

export interface GrammarTestOutcomeRecord {
  correction: {
    expected: string
    tokens: { actual: string | null; expected: string | null; status: string }[]
  } | null
  explanation: string
  isCorrect: boolean
  matchedAnswer: string | null
  pointSlug: string
  pointTitle: string
  prompt: string
  questionId: string
  /** True when this miss pushed the point back onto the review ladder. */
  knockedBack: boolean
  userAnswer: string
  /** Null when the point was left alone (ignored, or answered correctly). */
  stageAfter: number | null
}

export interface GrammarTestReportRecord {
  correct: number
  knockedBack: string[]
  notice: string | null
  outcomes: GrammarTestOutcomeRecord[]
  total: number
}
