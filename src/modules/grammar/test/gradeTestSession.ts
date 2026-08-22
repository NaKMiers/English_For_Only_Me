import { resolveGrammarAnswer } from '../grading/resolveGrammarAnswer'
import type { GrammarDrillRecord, GrammarUserItemStatus } from '../types'

import type {
  GrammarTestOutcomeRecord,
  GrammarTestQuestionRecord,
} from './types'

/**
 * What the ladder should do about one answer.
 *
 * `null` means leave the point alone entirely - no item row written, no status
 * touched. That is the majority case, and it is the whole point of D1.
 */
export interface LadderEffect {
  pointSlug: string
  /** Stage to write. Always 1: a miss goes back to the bottom. */
  recallStage: 1
  status: Extract<GrammarUserItemStatus, 'learning'>
}

export interface GradedTestQuestion {
  effect: LadderEffect | null
  outcome: GrammarTestOutcomeRecord
  /** For the attempt row. 0 means the point had no ladder row. */
  stageAfter: number
  stageBefore: number
  verdict: 'correct' | 'wrong'
}

/**
 * Grade one test answer and decide what it does to the review ladder.
 *
 * ```
 *                     answer graded server-side
 *                              |
 *              +---------------+---------------+
 *              |                               |
 *          CORRECT                          WRONG
 *              |                               |
 *   attempt row only                  status 'ignored'?
 *   stage unchanged                   /              \
 *   no item row created            yes                no
 *              |                    |                  |
 *              v            attempt row only     learning, stage 1,
 *          nothing else     status untouched     due now (item upserted)
 * ```
 *
 * Two rules, both deliberate, both from the office-hours decision (D1):
 *
 * 1. A CORRECT ANSWER PROMOTES NOTHING. This is what makes a test always safe
 *    to take. If correct answers climbed the ladder, a 40-question test would
 *    reschedule 40 points in one sitting and a good guessing run would look
 *    like mastery. The test is allowed to find gaps; it is not allowed to
 *    manufacture progress.
 * 2. A WRONG ANSWER RESETS. Straight to stage 1 and due now, from any prior
 *    stage - including from `mastered` and `alreadyKnow`, because those are
 *    claims about ability and getting the question wrong falsifies them. That
 *    is the test doing its job.
 *
 * The one exception is `ignored`. It is not a claim, it is an instruction: the
 * learner said stop showing me this. `selectTestPoints` already excludes those
 * points, so reaching this branch means the status changed mid-test - and even
 * then the answer is recorded without overriding them.
 *
 * `stageBefore: 0` means the point had no ladder row when the test was built,
 * which is legal and honest - see `GrammarDrillAttemptModel`. A correct answer
 * on such a point stays 0/0 and creates nothing.
 *
 * Pure: no database, no clock. Both the ladder rule and the stage arithmetic
 * are therefore testable directly.
 */
export function gradeTestQuestion({
  answer,
  question,
  status,
}: {
  answer: string
  question: GrammarTestQuestionRecord
  /** The point's status right now, or null when it has no item row. */
  status: GrammarUserItemStatus | null
}): GradedTestQuestion {
  const drill: GrammarDrillRecord = {
    acceptedAnswers: question.acceptedAnswers,
    choices: question.choices,
    difficulty: 1,
    explanation: question.explanation,
    id: question.drillId,
    kind: question.kind,
    prompt: question.prompt,
    punctuationSensitive: question.punctuationSensitive,
    target: question.target,
  }
  const grade = resolveGrammarAnswer({ answer, drill })
  const outcomeBase = {
    correction: grade.correction
      ? {
          expected: grade.matchedAnswer ?? question.target,
          tokens: grade.correction.feedbackTokens.map(token => ({
            actual: token.actualOriginal ?? token.actual,
            expected: token.expectedOriginal ?? token.expected,
            status: token.status,
          })),
        }
      : null,
    explanation: question.explanation,
    matchedAnswer: grade.matchedAnswer,
    pointSlug: question.pointSlug,
    pointTitle: question.pointTitle,
    prompt: question.prompt,
    questionId: question.id,
    userAnswer: answer,
  }

  if (grade.isCorrect)
    return {
      effect: null,
      outcome: {
        ...outcomeBase,
        isCorrect: true,
        knockedBack: false,
        stageAfter: null,
      },
      stageAfter: question.stageBefore,
      stageBefore: question.stageBefore,
      verdict: 'correct',
    }

  if (status === 'ignored')
    return {
      effect: null,
      outcome: {
        ...outcomeBase,
        isCorrect: false,
        knockedBack: false,
        stageAfter: null,
      },
      stageAfter: question.stageBefore,
      stageBefore: question.stageBefore,
      verdict: 'wrong',
    }

  return {
    effect: {
      pointSlug: question.pointSlug,
      recallStage: 1,
      status: 'learning',
    },
    outcome: {
      ...outcomeBase,
      isCorrect: false,
      knockedBack: true,
      stageAfter: 1,
    },
    stageAfter: 1,
    stageBefore: question.stageBefore,
    verdict: 'wrong',
  }
}

export interface GradedTestSession {
  correct: number
  graded: GradedTestQuestion[]
  knockedBack: string[]
  total: number
}

/**
 * Grade a whole submitted test.
 *
 * Every stored question is graded, including ones the learner skipped - a blank
 * answer is a wrong answer, because leaving it blank on a test you chose to take
 * is information. Answers arrive keyed by question id, so a missing or
 * unrecognised key simply grades as empty rather than shifting every subsequent
 * question by one.
 */
export function gradeTestSession({
  answers,
  questions,
  statusBySlug,
}: {
  answers: { answer: string; questionId: string }[]
  questions: GrammarTestQuestionRecord[]
  statusBySlug: Map<string, GrammarUserItemStatus | null>
}): GradedTestSession {
  const answerById = new Map(
    answers.map(entry => [entry.questionId, entry.answer])
  )
  const graded = questions.map(question =>
    gradeTestQuestion({
      answer: answerById.get(question.id) ?? '',
      question,
      status: statusBySlug.get(question.pointSlug) ?? null,
    })
  )

  return {
    correct: graded.filter(entry => entry.verdict === 'correct').length,
    graded,
    // Deduplicated: two misses on the same point are one knock-back, and the
    // report says "3 rules went back to the start", not "3 answers were wrong".
    knockedBack: [
      ...new Set(
        graded
          .filter(entry => entry.effect)
          .map(entry => entry.outcome.pointSlug)
      ),
    ],
    total: questions.length,
  }
}
