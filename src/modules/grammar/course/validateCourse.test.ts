import { describe, expect, it } from 'vitest'

import { gradeCard, getOrderTiles, splitWords } from '../grading/gradeCard'

import { GRAMMAR_COURSE } from './index'
import { isPracticeCard, type GrammarUnit } from './types'
import { validateCourse } from './validateCourse'

describe('the shipped grammar course', () => {
  it('passes every structural check', () => {
    expect(validateCourse(GRAMMAR_COURSE)).toEqual([])
  })

  it('has unit orders 1..n with no gaps', () => {
    expect(GRAMMAR_COURSE.map(unit => unit.order)).toEqual(
      GRAMMAR_COURSE.map((_, index) => index + 1)
    )
  })

  // Every card must be answerable through the UI it renders: the canonical
  // answer, fed back through the grader, has to come out correct.
  it('grades the canonical answer of every practice card as correct', () => {
    const failures: string[] = []

    for (const unit of GRAMMAR_COURSE)
      for (const lesson of unit.lessons)
        for (const card of lesson.cards.filter(isPracticeCard)) {
          const grade =
            card.kind === 'choice'
              ? gradeCard(card, { kind: 'choice', value: card.answer })
              : card.kind === 'fill'
                ? gradeCard(card, {
                    kind: 'fill',
                    value: card.answers[0] ?? '',
                  })
                : card.kind === 'order'
                  ? gradeCard(card, {
                      kind: 'order',
                      value: splitWords(card.sentence),
                    })
                  : gradeCard(card, { kind: 'fix', value: card.wrongIndex })

          if (!grade.correct) failures.push(card.id)
        }

    expect(failures).toEqual([])
  })

  it('offers order tiles that can build the sentence', () => {
    for (const unit of GRAMMAR_COURSE)
      for (const lesson of unit.lessons)
        for (const card of lesson.cards)
          if (card.kind === 'order')
            expect(getOrderTiles(card).length).toBeGreaterThanOrEqual(
              splitWords(card.sentence).length
            )
  })
})

function unitWith(overrides: Partial<GrammarUnit> = {}): GrammarUnit {
  const lesson = (n: number) => ({
    id: `u09-l0${n}`,
    title: 'T',
    titleEn: 'T',
    summary: 'S',
    cards: [
      ...[1, 2, 3].map(i => ({
        kind: 'explain' as const,
        id: `u09-l0${n}-c0${i}`,
        title: 'x',
        body: 'y',
        examples: [{ en: 'a', vi: 'b' }],
      })),
      ...[4, 5, 6, 7, 8, 9].map(i => ({
        kind: 'choice' as const,
        id: `u09-l0${n}-c0${i}`,
        prompt: 'p',
        options: ['a', 'b'],
        answer: 0,
        explain: 'e',
      })),
      ...[10, 11].map(i => ({
        kind: 'fill' as const,
        id: `u09-l0${n}-c${i}`,
        prompt: 'p',
        sentence: 'I ___ here.',
        answers: ['am'],
        explain: 'e',
      })),
    ],
  })

  return {
    id: 'u09',
    order: 1,
    level: 'B1',
    title: 'U',
    summary: 'S',
    lessons: [1, 2, 3, 4, 5].map(lesson),
    ...overrides,
  }
}

describe('validateCourse', () => {
  it('accepts a minimal valid unit', () => {
    expect(validateCourse([unitWith()])).toEqual([])
  })

  it('reports a wrong lesson count', () => {
    const unit = unitWith()

    unit.lessons = unit.lessons.slice(0, 4)

    expect(validateCourse([unit])).toContain('u09: needs exactly 5 lessons')
  })

  it('reports em dashes, bad answer indexes, missing blanks and bank answers', () => {
    const unit = unitWith()
    const cards = unit.lessons[0]!.cards

    cards[3] = {
      ...cards[3]!,
      explain: `a ${String.fromCharCode(0x2014)} b`,
    } as (typeof cards)[number]
    cards[4] = { ...(cards[4] as object), answer: 5 } as (typeof cards)[number]
    cards[9] = {
      kind: 'fill',
      id: 'u09-l01-c10',
      prompt: 'p',
      sentence: 'no blank',
      answers: ['am'],
      bank: ['is', 'are'],
      explain: 'e',
    }

    const errors = validateCourse([unit])

    expect(errors).toContain('u09-l01/u09-l01-c04: contains an em dash')
    expect(errors).toContain(
      'u09-l01/u09-l01-c05: choice answer index out of range'
    )
    expect(errors).toContain('u09-l01/u09-l01-c10: fill needs exactly one ___')
    expect(errors).toContain(
      'u09-l01/u09-l01-c10: fill bank must contain the first answer'
    )
  })

  it('reports order alternatives built from other words and in-sentence distractors', () => {
    const unit = unitWith()

    unit.lessons[0]!.cards[10] = {
      kind: 'order',
      id: 'u09-l01-c11',
      prompt: 'p',
      sentence: 'I am a student.',
      alternatives: ['I am the student.'],
      distractors: ['am'],
      explain: 'e',
    }

    const errors = validateCourse([unit])

    expect(errors).toContain(
      'u09-l01/u09-l01-c11: alternative "I am the student." uses other words'
    )
    expect(errors).toContain(
      'u09-l01/u09-l01-c11: distractor "am" is in the sentence'
    )
  })

  it('reports duplicate and malformed card ids', () => {
    const unit = unitWith()

    unit.lessons[1]!.cards[0] = { ...unit.lessons[0]!.cards[0]! }

    const errors = validateCourse([unit])

    expect(errors).toContain(
      'u09-l02/u09-l01-c01: card id must look like u09-l02-cNN'
    )
    expect(errors).toContain('u09-l02/u09-l01-c01: duplicate card id')
  })
})
