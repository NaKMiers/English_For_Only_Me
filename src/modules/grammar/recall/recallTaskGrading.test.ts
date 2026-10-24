import { describe, expect, it } from 'vitest'

import { resolveGrammarAnswer } from '@/modules/grammar/grading/resolveGrammarAnswer'
import type { GrammarDrillRecord } from '@/modules/grammar/types'
import {
  applyRecallAnswer,
  type RecallDifficulty,
} from '@/modules/learning/recall/recallLadder'

import {
  predictGrammarRecallResult,
  toRecallCorrection,
  toServedRecallTask,
  type GrammarServedRecallTask,
} from './recallTaskGrading'

const NOW = new Date('2026-10-24T08:00:00.000Z')

const POINT = {
  cefrLevel: 'B1',
  complexity: 3,
  family: 'tense-aspect',
  l1Risk: 'high',
  l1RiskObserved: null,
  reviewStatus: 'reviewed',
  slug: 'present-perfect',
  title: 'Present Perfect',
}

const ITEM = { correctCount: 3, recallStage: 4, reviewCount: 5, wrongCount: 2 }

function drill(overrides: Partial<GrammarDrillRecord>): GrammarDrillRecord {
  return {
    acceptedAnswers: [],
    choices: null,
    difficulty: 2,
    explanation: 'Present perfect links a past action to now.',
    generated: false,
    id: 'd1',
    kind: 'transform',
    prompt: 'Rewrite using the present perfect.',
    target: 'He has lived here for five years.',
    ...overrides,
  }
}

/**
 * The server path, exactly as `answerService.submitGrammarAnswer` runs it, but
 * against the FULL Mongo drill rather than the served task.
 */
function serverResult({
  answer,
  difficulty,
  fullDrill,
  revealed = false,
}: {
  answer: string
  difficulty: RecallDifficulty
  fullDrill: GrammarDrillRecord
  revealed?: boolean
}) {
  const grade = resolveGrammarAnswer({ answer, drill: fullDrill, revealed })
  const patch = applyRecallAnswer({
    difficulty,
    isCorrect: grade.isCorrect,
    item: ITEM,
    now: NOW,
  })

  return {
    correction: toRecallCorrection(grade, fullDrill.target),
    explanation: fullDrill.explanation,
    isCorrect: grade.isCorrect,
    matchedAnswer: grade.matchedAnswer,
    recallStage: patch.recallStage,
    dueAt: patch.dueAt ? patch.dueAt.toISOString() : null,
    verdict: grade.verdict,
  }
}

/** Serve the drill and send it through JSON, as the due route does. */
function served(fullDrill: GrammarDrillRecord, point = POINT) {
  return JSON.parse(
    JSON.stringify(
      toServedRecallTask({
        drill: fullDrill,
        idempotencyKey: 'key-0001',
        item: ITEM,
        point,
      })
    )
  ) as GrammarServedRecallTask
}

const CHOICE = drill({
  choices: [
    'She has finished her homework.',
    'She have finished her homework.',
    'She has finish her homework.',
  ],
  id: 'choice-1',
  kind: 'choice',
  target: 'She has finished her homework.',
})

const FILL = drill({
  acceptedAnswers: ["haven't seen"],
  id: 'fill-1',
  kind: 'fillBlank',
  target: 'have not seen',
})

const CONTRACTION = drill({
  acceptedAnswers: ["He's lived here for five years."],
  id: 'transform-1',
  target: 'He has lived here for five years.',
})

const PAST_PERFECT = drill({
  acceptedAnswers: ["He'd already left when we arrived."],
  id: 'correct-1',
  kind: 'correct',
  target: 'He had already left when we arrived.',
})

const PUNCTUATION_SENSITIVE = drill({
  id: 'build-1',
  kind: 'build',
  punctuationSensitive: true,
  target: 'My brother, who lives in Hue, is a doctor.',
})

const CASES: { answer: string; fullDrill: GrammarDrillRecord }[] = [
  { answer: 'She has finished her homework.', fullDrill: CHOICE },
  { answer: 'She have finished her homework.', fullDrill: CHOICE },
  { answer: '', fullDrill: CHOICE },
  { answer: "haven't seen", fullDrill: FILL },
  { answer: 'have not seen', fullDrill: FILL },
  { answer: 'has not seen', fullDrill: FILL },
  { answer: 'He has lived here for five years', fullDrill: CONTRACTION },
  { answer: "He's lived here for five years", fullDrill: CONTRACTION },
  // The contraction trap: expandContractions would wrongly accept this.
  { answer: 'He is lived here for five years', fullDrill: CONTRACTION },
  { answer: 'He has live here for five years', fullDrill: CONTRACTION },
  { answer: 'He would already left when we arrived', fullDrill: PAST_PERFECT },
  { answer: "He'd already left when we arrived.", fullDrill: PAST_PERFECT },
  {
    answer: 'My brother who lives in Hue is a doctor',
    fullDrill: PUNCTUATION_SENSITIVE,
  },
  {
    answer: 'My brother, who lives in Hue, is a doctor',
    fullDrill: PUNCTUATION_SENSITIVE,
  },
  {
    answer: 'He has lived, here for five years',
    fullDrill: CONTRACTION,
  },
]

describe('grammar recall grading parity (browser vs server)', () => {
  it.each(CASES)(
    'matches the server for "$answer" on $fullDrill.id',
    ({ answer, fullDrill }) => {
      const client = predictGrammarRecallResult({
        answer,
        now: NOW,
        task: served(fullDrill),
      })
      const server = serverResult({ answer, difficulty: 'high', fullDrill })

      expect({
        correction: client.correction,
        dueAt: client.item.dueAt,
        explanation: client.explanation,
        isCorrect: client.isCorrect,
        matchedAnswer: client.matchedAnswer,
        recallStage: client.item.recallStage,
        verdict: client.verdict,
      }).toEqual(server)
    }
  )

  it('keeps the contraction guard: "He is lived" is wrong on both sides', () => {
    const client = predictGrammarRecallResult({
      answer: 'He is lived here for five years',
      now: NOW,
      task: served(CONTRACTION),
    })

    expect(client.verdict).toBe('wrong')
    expect(client.item.recallStage).toBe(1)
  })

  it('matches the server on a reveal', () => {
    const client = predictGrammarRecallResult({
      answer: '',
      now: NOW,
      revealed: true,
      task: served(CONTRACTION),
    })
    const server = serverResult({
      answer: '',
      difficulty: 'high',
      fullDrill: CONTRACTION,
      revealed: true,
    })

    expect(client.verdict).toBe('revealed')
    expect(client.verdict).toBe(server.verdict)
    expect(client.matchedAnswer).toBe(server.matchedAnswer)
    expect(client.item.recallStage).toBe(server.recallStage)
  })

  it.each(['low', 'medium', 'high'] as const)(
    'schedules with the point l1Risk as difficulty (%s)',
    l1Risk => {
      const client = predictGrammarRecallResult({
        answer: CONTRACTION.target,
        now: NOW,
        task: served(CONTRACTION, { ...POINT, l1Risk }),
      })
      const server = serverResult({
        answer: CONTRACTION.target,
        difficulty: l1Risk,
        fullDrill: CONTRACTION,
      })

      expect(client.item.dueAt).toBe(server.dueAt)
      expect(client.item.recallStage).toBe(5)
    }
  )

  it('predicts mastery at the top rung like the server', () => {
    const task = { ...served(CONTRACTION), recallStage: 7 }
    const client = predictGrammarRecallResult({
      answer: CONTRACTION.target,
      now: NOW,
      task,
    })

    expect(client.item.status).toBe('mastered')
    expect(client.item.dueAt).toBeNull()
  })
})

describe('toServedRecallTask', () => {
  it('serves only what grading needs, not the whole drill', () => {
    const task = toServedRecallTask({
      drill: drill({ difficulty: 3, generated: true }),
      idempotencyKey: 'key-0001',
      item: ITEM,
      point: POINT,
    })

    expect(task.grading).toEqual({
      acceptedAnswers: [],
      explanation: 'Present perfect links a past action to now.',
      punctuationSensitive: false,
      target: 'He has lived here for five years.',
    })
    expect(task.counters).toEqual({
      correctCount: 3,
      reviewCount: 5,
      wrongCount: 2,
    })
    expect(task).not.toHaveProperty('difficulty')
    expect(task).not.toHaveProperty('generated')
  })
})
