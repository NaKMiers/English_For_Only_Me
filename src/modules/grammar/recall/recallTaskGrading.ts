import {
  resolveGrammarAnswer,
  type GrammarGradeResult,
} from '@/modules/grammar/grading/resolveGrammarAnswer'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarDrillRecord,
  GrammarFamily,
  GrammarL1Risk,
  GrammarRecallAnswerResult,
  GrammarRecallTaskRecord,
  GrammarReviewStatus,
  UserGrammarItemApiRecord,
} from '@/modules/grammar/types'
import {
  applyRecallAnswer,
  type RecallDifficulty,
} from '@/modules/learning/recall/recallLadder'

/**
 * What the browser needs to grade a served recall drill exactly the way the
 * server does: the fields `resolveGrammarAnswer` reads, plus the explanation it
 * returns.
 *
 * Sending these is an owner decision, not an oversight. This is a one-owner
 * learning app, and an instant verdict is worth more than hiding the answer
 * key from the person it was written for. The server still re-grades every
 * answer from Mongo and its verdict wins. The diagnostic TEST does not get
 * this: its questions stay answer-free until submit.
 */
export interface GrammarRecallTaskGrading {
  acceptedAnswers: string[]
  explanation: string
  punctuationSensitive: boolean
  target: string
}

/** The learner's ladder counters when the drill was served. */
export interface GrammarRecallTaskCounters {
  correctCount: number
  reviewCount: number
  wrongCount: number
}

export interface GrammarServedRecallTask extends GrammarRecallTaskRecord {
  counters: GrammarRecallTaskCounters
  grading: GrammarRecallTaskGrading
}

interface ServedPointLike {
  cefrLevel: string
  complexity: number
  family: string
  l1Risk: string
  l1RiskObserved?: string | null
  reviewStatus: string
  slug: string
  title: string
}

interface ServedItemLike {
  correctCount: number
  recallStage: number
  reviewCount: number
  wrongCount: number
}

/**
 * Build one served task. Pure, so the parity test exercises the exact mapping
 * the due queue uses; the caller mints `idempotencyKey`.
 */
export function toServedRecallTask({
  drill,
  idempotencyKey,
  item,
  point,
}: {
  drill: GrammarDrillRecord
  idempotencyKey: string
  item: ServedItemLike
  point: ServedPointLike
}): GrammarServedRecallTask {
  return {
    cefrLevel: point.cefrLevel as GrammarCefrLevel,
    choices: drill.choices ?? null,
    complexity: point.complexity as GrammarComplexity,
    counters: {
      correctCount: item.correctCount,
      reviewCount: item.reviewCount,
      wrongCount: item.wrongCount,
    },
    drillId: drill.id,
    family: point.family as GrammarFamily,
    grading: {
      acceptedAnswers: drill.acceptedAnswers ?? [],
      explanation: drill.explanation,
      punctuationSensitive: drill.punctuationSensitive === true,
      target: drill.target,
    },
    idempotencyKey,
    kind: drill.kind,
    l1Risk: point.l1Risk as GrammarL1Risk,
    l1RiskObserved: (point.l1RiskObserved ?? null) as GrammarL1Risk | null,
    pointSlug: point.slug,
    pointTitle: point.title,
    prompt: drill.prompt,
    recallStage: item.recallStage,
    reviewStatus: point.reviewStatus as GrammarReviewStatus,
  }
}

/**
 * Rebuild the drill `resolveGrammarAnswer` grades against. `difficulty` and
 * `generated` are not read by the grader, so placeholders are safe.
 */
export function toGradableDrill(
  task: GrammarServedRecallTask
): GrammarDrillRecord {
  return {
    acceptedAnswers: task.grading.acceptedAnswers,
    choices: task.choices,
    difficulty: 1,
    explanation: task.grading.explanation,
    id: task.drillId,
    kind: task.kind,
    prompt: task.prompt,
    punctuationSensitive: task.grading.punctuationSensitive,
    target: task.grading.target,
  }
}

/** The API shape of a grade's token diff. Shared so both sides render alike. */
export function toRecallCorrection(
  grade: GrammarGradeResult,
  target: string
): GrammarRecallAnswerResult['correction'] {
  if (!grade.correction) return null

  return {
    expected: grade.matchedAnswer ?? target,
    tokens: grade.correction.feedbackTokens.map(token => ({
      actual: token.actualOriginal ?? token.actual,
      expected: token.expectedOriginal ?? token.expected,
      status: token.status,
    })),
  }
}

/**
 * Grade in the browser and predict the ladder move, so the verdict shows the
 * moment the learner answers. The server re-grades with the same function and
 * the same difficulty (`point.l1Risk`); when it answers, its result replaces
 * this one.
 */
export function predictGrammarRecallResult({
  answer,
  now = new Date(),
  revealed = false,
  task,
}: {
  answer: string
  now?: Date
  revealed?: boolean
  task: GrammarServedRecallTask
}): GrammarRecallAnswerResult {
  const grade = resolveGrammarAnswer({
    answer,
    drill: toGradableDrill(task),
    revealed,
  })
  const patch = applyRecallAnswer({
    difficulty: task.l1Risk as RecallDifficulty,
    isCorrect: grade.isCorrect,
    item: { ...task.counters, recallStage: task.recallStage },
    now,
  })
  const item: UserGrammarItemApiRecord = {
    correctCount: patch.correctCount,
    dueAt: patch.dueAt ? patch.dueAt.toISOString() : null,
    lastReviewedAt: patch.lastReviewedAt.toISOString(),
    masteredAt: patch.masteredAt ? patch.masteredAt.toISOString() : null,
    pointSlug: task.pointSlug,
    recallStage: patch.recallStage,
    reviewCount: patch.reviewCount,
    status: patch.status,
    wrongCount: patch.wrongCount,
  }

  return {
    correction: toRecallCorrection(grade, task.grading.target),
    explanation: task.grading.explanation,
    isCorrect: grade.isCorrect,
    item,
    matchedAnswer: grade.matchedAnswer,
    verdict: grade.verdict,
  }
}
