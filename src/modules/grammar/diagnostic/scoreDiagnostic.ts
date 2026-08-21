import { GRAMMAR_DIAGNOSTIC_CORRECT_STAGE } from '@/modules/grammar/constants'
import type {
  GrammarCefrLevel,
  GrammarL1Risk,
  GrammarReviewStatus,
} from '@/modules/grammar/types'
import {
  getRecallIntervalDays,
  type RecallDifficulty,
  type RecallStage,
} from '@/modules/learning/recall/recallLadder'

const DAY_MS = 86_400_000

export interface DiagnosticOutcome {
  cefrLevel: GrammarCefrLevel
  isCorrect: boolean
  l1Risk: GrammarL1Risk
  pointSlug: string
  reviewStatus: GrammarReviewStatus
}

export interface DiagnosticSeed {
  dueAt: Date
  pointSlug: string
  recallStage: RecallStage
}

/**
 * Turn one diagnostic answer into a STARTING LADDER POSITION, not a verdict.
 *
 * This is the design decision that makes a placement test worth taking. The
 * obvious approach is binary: got it right means "already known", got it wrong
 * means "needs learning". That throws away most of the information and is
 * actively wrong in both directions - a lucky guess on a four-option item marks
 * a weak point as known and removes it from review forever, and one slip marks a
 * solid point as a beginner topic.
 *
 * Instead a correct answer seeds mid-ladder. The point is treated as probably
 * known, so it returns in a few days rather than tomorrow - and if that check
 * fails, the normal ladder drops it straight back to stage 1. The diagnostic
 * gets to be evidence without having to be proof.
 *
 * The seeded due date respects the point's own difficulty, so a high-L1-risk
 * point the learner got right still comes back sooner than an easy one.
 */
export function seedFromDiagnostic({
  now = new Date(),
  outcome,
}: {
  now?: Date
  outcome: DiagnosticOutcome
}): DiagnosticSeed {
  if (!outcome.isCorrect)
    return {
      dueAt: now,
      pointSlug: outcome.pointSlug,
      recallStage: 1,
    }

  const stage = GRAMMAR_DIAGNOSTIC_CORRECT_STAGE as RecallStage
  const intervalDays =
    getRecallIntervalDays({
      difficulty: outcome.l1Risk as RecallDifficulty,
      stage,
    }) ?? 1

  return {
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    pointSlug: outcome.pointSlug,
    recallStage: stage,
  }
}

export interface DiagnosticSummary {
  byLevel: { cefrLevel: GrammarCefrLevel; correct: number; total: number }[]
  byRisk: { correct: number; l1Risk: GrammarL1Risk; total: number }[]
  correct: number
  /**
   * The levels where accuracy fell below half. Named explicitly because a raw
   * score tells a learner nothing about where to spend their time.
   */
  weakestLevels: GrammarCefrLevel[]
  weakestRisks: GrammarL1Risk[]
  total: number
  /**
   * How many of the tested rules have a lesson no human has read.
   *
   * Counted by point, not by answer: the result screen states a number of
   * RULES. This is here rather than at the call site because the result screen
   * makes confident claims about the learner on the strength of generated
   * content, and the honest version of that claim needs this number next to it.
   */
  unverifiedCount: number
}

/**
 * Summarise a completed diagnostic.
 *
 * Reports accuracy broken down by CEFR level and by L1 risk, and names the weak
 * areas rather than only a total. "You scored 24/40" is not actionable; "you are
 * below half on B2 and on high-interference points" is.
 */
export function summariseDiagnostic(
  outcomes: DiagnosticOutcome[]
): DiagnosticSummary {
  const levels = new Map<GrammarCefrLevel, { correct: number; total: number }>()
  const risks = new Map<GrammarL1Risk, { correct: number; total: number }>()
  const unverifiedSlugs = new Set<string>()

  for (const outcome of outcomes) {
    if (outcome.reviewStatus !== 'reviewed')
      unverifiedSlugs.add(outcome.pointSlug)

    const level = levels.get(outcome.cefrLevel) ?? { correct: 0, total: 0 }
    const risk = risks.get(outcome.l1Risk) ?? { correct: 0, total: 0 }

    level.total += 1
    risk.total += 1
    if (outcome.isCorrect) {
      level.correct += 1
      risk.correct += 1
    }

    levels.set(outcome.cefrLevel, level)
    risks.set(outcome.l1Risk, risk)
  }

  const byLevel = [...levels.entries()]
    .map(([cefrLevel, counts]) => ({ cefrLevel, ...counts }))
    .sort((left, right) => left.cefrLevel.localeCompare(right.cefrLevel))
  const byRisk = [...risks.entries()]
    .map(([l1Risk, counts]) => ({ l1Risk, ...counts }))
    .sort((left, right) => left.l1Risk.localeCompare(right.l1Risk))

  return {
    byLevel,
    byRisk,
    correct: outcomes.filter(outcome => outcome.isCorrect).length,
    total: outcomes.length,
    weakestLevels: byLevel
      .filter(entry => entry.total > 0 && entry.correct / entry.total < 0.5)
      .map(entry => entry.cefrLevel),
    unverifiedCount: unverifiedSlugs.size,
    weakestRisks: byRisk
      .filter(entry => entry.total > 0 && entry.correct / entry.total < 0.5)
      .map(entry => entry.l1Risk),
  }
}
