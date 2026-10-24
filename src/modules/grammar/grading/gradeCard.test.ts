import { describe, expect, it } from 'vitest'

import type {
  ChoiceCard,
  FillCard,
  FixCard,
  OrderCard,
} from '@/modules/grammar/course/types'

import {
  getOrderTiles,
  gradeCard,
  normalizeGrammarAnswer,
  parseCardAnswer,
} from './gradeCard'

const choice: ChoiceCard = {
  kind: 'choice',
  id: 'c',
  prompt: 'p',
  options: ['am', 'is', 'are'],
  answer: 1,
  explain: 'e',
}

const fill: FillCard = {
  kind: 'fill',
  id: 'f',
  prompt: 'p',
  sentence: 'She ___ (not / like) coffee.',
  answers: ["doesn't like", 'does not like'],
  explain: 'e',
}

const order: OrderCard = {
  kind: 'order',
  id: 'o',
  prompt: 'p',
  sentence: 'Where are my keys?',
  alternatives: [],
  distractors: ['is'],
  explain: 'e',
}

const fix: FixCard = {
  kind: 'fix',
  id: 'x',
  prompt: 'p',
  tokens: ['He', 'go', 'to', 'school.'],
  wrongIndex: 1,
  correction: 'goes',
  explain: 'e',
}

describe('normalizeGrammarAnswer', () => {
  it.each([
    ['  She   Works. ', 'she works'],
    ['Really?!', 'really'],
    ['don’t', "don't"],
    ['Yes , I am', 'yes, i am'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeGrammarAnswer(input)).toBe(expected)
  })

  it('does not expand contractions', () => {
    expect(normalizeGrammarAnswer("he's")).not.toBe(
      normalizeGrammarAnswer('he has')
    )
  })
})

describe('gradeCard', () => {
  it('grades choice by index only', () => {
    expect(gradeCard(choice, { kind: 'choice', value: 1 })).toEqual({
      correct: true,
      expected: 'is',
    })
    expect(gradeCard(choice, { kind: 'choice', value: 2 }).correct).toBe(false)
    expect(gradeCard(choice, { kind: 'fill', value: 'is' }).correct).toBe(false)
  })

  it('shows a gapped choice sentence filled in as the expected answer', () => {
    const gapped = { ...choice, sentence: 'She ___ tired.' }

    expect(gradeCard(gapped, { kind: 'choice', value: 0 }).expected).toBe(
      'She is tired.'
    )
  })

  it('accepts any listed fill answer, ignoring case and spacing', () => {
    expect(
      gradeCard(fill, { kind: 'fill', value: 'Does  not like' }).correct
    ).toBe(true)
    expect(
      gradeCard(fill, { kind: 'fill', value: 'doesn’t like' }).correct
    ).toBe(true)
    expect(gradeCard(fill, { kind: 'fill', value: "don't like" }).correct).toBe(
      false
    )
    expect(gradeCard(fill, { kind: 'fill', value: '   ' }).correct).toBe(false)
    expect(gradeCard(fill, { kind: 'fill', value: '' }).expected).toBe(
      "She doesn't like coffee."
    )
  })

  it('grades order by the joined tiles', () => {
    expect(
      gradeCard(order, { kind: 'order', value: ['Where', 'are', 'my', 'keys'] })
        .correct
    ).toBe(true)
    expect(
      gradeCard(order, { kind: 'order', value: ['Where', 'my', 'keys', 'are'] })
        .correct
    ).toBe(false)
    expect(gradeCard(order, { kind: 'order', value: [] }).correct).toBe(false)
  })

  it('accepts listed alternative word orders', () => {
    const card = { ...order, alternatives: ['My keys are where'] }

    expect(
      gradeCard(card, { kind: 'order', value: ['my', 'keys', 'are', 'where'] })
        .correct
    ).toBe(true)
  })

  it('grades fix by the tapped token and shows the corrected sentence', () => {
    expect(gradeCard(fix, { kind: 'fix', value: 1 })).toEqual({
      correct: true,
      expected: 'He goes to school.',
    })
    expect(gradeCard(fix, { kind: 'fix', value: 0 }).correct).toBe(false)
  })

  it('drops a deleted token from the corrected sentence', () => {
    const deleting = {
      ...fix,
      tokens: ['She', 'is', 'is', 'here.'],
      correction: '',
    }

    expect(gradeCard(deleting, { kind: 'fix', value: 1 }).expected).toBe(
      'She is here.'
    )
  })
})

describe('getOrderTiles', () => {
  it('splits the sentence without final punctuation and adds distractors', () => {
    expect(getOrderTiles(order)).toEqual(['Where', 'are', 'my', 'keys', 'is'])
  })
})

describe('parseCardAnswer', () => {
  it('accepts well-formed answers per kind', () => {
    expect(parseCardAnswer(choice, 2)).toEqual({ kind: 'choice', value: 2 })
    expect(parseCardAnswer(fill, 'x')).toEqual({ kind: 'fill', value: 'x' })
    expect(parseCardAnswer(order, ['a'])).toEqual({
      kind: 'order',
      value: ['a'],
    })
    expect(parseCardAnswer(fix, 0)).toEqual({ kind: 'fix', value: 0 })
  })

  it.each([
    [choice, '1'],
    [choice, 1.5],
    [fill, 3],
    [fill, 'x'.repeat(201)],
    [order, 'a b'],
    [order, [1]],
    [order, Array.from({ length: 41 }, () => 'a')],
    [fix, null],
  ])('rejects malformed answer %#', (card, value) => {
    expect(parseCardAnswer(card, value)).toBeNull()
  })
})
