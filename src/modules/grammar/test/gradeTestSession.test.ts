import { describe, expect, it } from 'vitest'

import { gradeTestQuestion, gradeTestSession } from './gradeTestSession'
import type { GrammarTestQuestionRecord } from './types'

function question(
  overrides: Partial<GrammarTestQuestionRecord> = {}
): GrammarTestQuestionRecord {
  return {
    acceptedAnswers: ['He has lived here for five years'],
    choices: null,
    drillId: 'd1',
    explanation: 'Present perfect links a past action to now.',
    generated: false,
    id: 'q1',
    kind: 'transform',
    pointSlug: 'present-perfect',
    pointTitle: 'Present Perfect',
    prompt: 'Rewrite using the present perfect.',
    punctuationSensitive: false,
    stageBefore: 4,
    target: 'He has lived here for five years',
    ...overrides,
  }
}

const RIGHT = 'He has lived here for five years'
const WRONG = 'He is lived here for five years'

describe('gradeTestQuestion', () => {
  /**
   * D1, first half. A test is always safe to take, and this is the mechanism:
   * a correct answer records that it happened and touches nothing else. If
   * correct answers promoted, a 40-question test would reschedule 40 points in
   * one sitting and a good guessing run would read as mastery.
   */
  describe('a correct answer promotes nothing', () => {
    it('leaves the ladder alone', () => {
      const result = gradeTestQuestion({
        answer: RIGHT,
        question: question({ stageBefore: 4 }),
        status: 'learning',
      })

      expect(result.effect).toBeNull()
      expect(result.stageBefore).toBe(4)
      expect(result.stageAfter).toBe(4)
      expect(result.verdict).toBe('correct')
      expect(result.outcome.knockedBack).toBe(false)
    })

    it('does not create a row for an untouched point', () => {
      const result = gradeTestQuestion({
        answer: RIGHT,
        question: question({ stageBefore: 0 }),
        status: null,
      })

      expect(result.effect).toBeNull()
      expect(result.stageBefore).toBe(0)
      expect(result.stageAfter).toBe(0)
    })

    it('does not promote a stage-6 point to mastery', () => {
      const result = gradeTestQuestion({
        answer: RIGHT,
        question: question({ stageBefore: 6 }),
        status: 'learning',
      })

      expect(result.stageAfter).toBe(6)
      expect(result.effect).toBeNull()
    })
  })

  /**
   * D1, second half. A miss resets, from any stage and from any claim about
   * ability - which is the whole reason a test is worth taking.
   */
  describe('a wrong answer resets', () => {
    it('drops a mid-ladder point to stage 1 and makes it due', () => {
      const result = gradeTestQuestion({
        answer: WRONG,
        question: question({ stageBefore: 5 }),
        status: 'learning',
      })

      expect(result.effect).toEqual({
        pointSlug: 'present-perfect',
        recallStage: 1,
        status: 'learning',
      })
      expect(result.stageBefore).toBe(5)
      expect(result.stageAfter).toBe(1)
      expect(result.outcome.knockedBack).toBe(true)
    })

    it('seeds an untouched point onto the ladder', () => {
      const result = gradeTestQuestion({
        answer: WRONG,
        question: question({ stageBefore: 0 }),
        status: null,
      })

      expect(result.effect?.recallStage).toBe(1)
      expect(result.stageBefore).toBe(0)
      expect(result.stageAfter).toBe(1)
    })

    it('demotes a mastered point', () => {
      const result = gradeTestQuestion({
        answer: WRONG,
        question: question({ stageBefore: 7 }),
        status: 'mastered',
      })

      expect(result.effect?.status).toBe('learning')
      expect(result.stageAfter).toBe(1)
    })

    it('demotes a point the learner claimed to know already', () => {
      const result = gradeTestQuestion({
        answer: WRONG,
        question: question(),
        status: 'alreadyKnow',
      })

      expect(result.effect?.status).toBe('learning')
    })

    it('treats a blank answer as wrong', () => {
      const result = gradeTestQuestion({
        answer: '',
        question: question(),
        status: 'learning',
      })

      expect(result.verdict).toBe('wrong')
      expect(result.effect).not.toBeNull()
    })
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * `selectTestPoints` already excludes ignored points, so reaching this branch
   * means the status changed mid-test. Even then the answer must not override
   * the learner: `ignored` is an instruction, not a claim about ability.
   */
  it('records but never resurrects an ignored point', () => {
    const result = gradeTestQuestion({
      answer: WRONG,
      question: question({ stageBefore: 3 }),
      status: 'ignored',
    })

    expect(result.effect).toBeNull()
    expect(result.verdict).toBe('wrong')
    expect(result.outcome.knockedBack).toBe(false)
    expect(result.outcome.stageAfter).toBeNull()
  })

  it('honours the punctuation flag it was stored with', () => {
    const sensitive = question({
      acceptedAnswers: ['The man, who left, waved'],
      punctuationSensitive: true,
      target: 'The man, who left, waved',
    })

    expect(
      gradeTestQuestion({
        answer: 'the man who left waved',
        question: sensitive,
        status: 'learning',
      }).verdict
    ).toBe('wrong')

    expect(
      gradeTestQuestion({
        answer: 'the man who left waved',
        question: { ...sensitive, punctuationSensitive: false },
        status: 'learning',
      }).verdict
    ).toBe('correct')
  })

  it('carries a token diff for a near miss on a production kind', () => {
    const result = gradeTestQuestion({
      answer: WRONG,
      question: question(),
      status: 'learning',
    })

    expect(result.outcome.correction?.tokens.length).toBeGreaterThan(0)
    expect(result.outcome.matchedAnswer).toBe(RIGHT)
  })
})

describe('gradeTestSession', () => {
  it('scores a mixed run and names the knocked-back points', () => {
    const result = gradeTestSession({
      answers: [
        { answer: RIGHT, questionId: 'q1' },
        { answer: WRONG, questionId: 'q2' },
        { answer: WRONG, questionId: 'q3' },
      ],
      questions: [
        question({ id: 'q1', pointSlug: 'a' }),
        question({ id: 'q2', pointSlug: 'b' }),
        question({ id: 'q3', pointSlug: 'c' }),
      ],
      statusBySlug: new Map([
        ['a', 'learning'],
        ['b', 'learning'],
        ['c', 'mastered'],
      ]),
    })

    expect(result.correct).toBe(1)
    expect(result.total).toBe(3)
    expect(result.knockedBack).toEqual(['b', 'c'])
  })

  it('counts two misses on the same point as one knock-back', () => {
    const result = gradeTestSession({
      answers: [
        { answer: WRONG, questionId: 'q1' },
        { answer: WRONG, questionId: 'q2' },
      ],
      questions: [
        question({ id: 'q1', pointSlug: 'same' }),
        question({ id: 'q2', pointSlug: 'same' }),
      ],
      statusBySlug: new Map([['same', 'learning']]),
    })

    expect(result.knockedBack).toEqual(['same'])
  })

  it('grades an unanswered question as wrong rather than skipping it', () => {
    const result = gradeTestSession({
      answers: [{ answer: RIGHT, questionId: 'q1' }],
      questions: [question({ id: 'q1' }), question({ id: 'q2' })],
      statusBySlug: new Map(),
    })

    expect(result.total).toBe(2)
    expect(result.correct).toBe(1)
  })

  it('ignores an answer for a question that is not in the session', () => {
    // A stale page could post an id from an earlier test. Matching by id rather
    // than by position means it is dropped instead of shifting every subsequent
    // answer onto the wrong question.
    const result = gradeTestSession({
      answers: [
        { answer: RIGHT, questionId: 'from-another-test' },
        { answer: RIGHT, questionId: 'q1' },
      ],
      questions: [question({ id: 'q1' })],
      statusBySlug: new Map(),
    })

    expect(result.total).toBe(1)
    expect(result.correct).toBe(1)
  })

  it('scores an all-blank submission as zero', () => {
    const result = gradeTestSession({
      answers: [{ answer: '', questionId: 'q1' }],
      questions: [question({ id: 'q1' })],
      statusBySlug: new Map([['present-perfect', 'learning']]),
    })

    expect(result.correct).toBe(0)
    expect(result.knockedBack).toEqual(['present-perfect'])
  })
})
