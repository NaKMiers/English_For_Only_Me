import { describe, expect, it } from 'vitest'

import type { IeltsAnswerKey } from './answerKey'
import {
  ACADEMIC_READING_BANDS,
  GENERAL_READING_BANDS,
  LISTENING_BANDS,
  rawToBand,
} from './bandTables'
import { normalizeIeltsAnswer, normalizeIeltsKey } from './normalize'
import { overallEstimate } from './overall'
import { roundOverallBand, roundTaskBand, writingBand } from './roundBand'
import { scoreObjective } from './scoreObjective'
import { countIeltsWords, isWithinWordLimit } from './wordCount'

describe('normalizeIeltsAnswer', () => {
  it.each([
    ['  Cooling  Costs. ', 'cooling costs'],
    ['“discount”', 'discount'],
    ['well–known', 'well-known'],
    ['well - known', 'well-known'],
    ['9 / 30', '9/30'],
    ['children’s', "children's"],
    ['he’s', "he's"],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeIeltsAnswer(input)).toBe(expected)
  })

  it('uppercases keys', () => {
    expect(normalizeIeltsKey(' not  given ')).toBe('NOT GIVEN')
  })
})

describe('word limits', () => {
  it('counts hyphenated words once and numbers separately', () => {
    expect(countIeltsWords('well-known 25 May')).toEqual({
      numbers: 1,
      words: 2,
    })
  })

  it('applies AND/OR A NUMBER', () => {
    const limit = { maxWords: 1, allowNumber: true }

    expect(isWithinWordLimit('25 May', limit)).toBe(true)
    expect(isWithinWordLimit('late May', limit)).toBe(false)
    expect(isWithinWordLimit('25', limit)).toBe(true)
    expect(isWithinWordLimit('25 26', limit)).toBe(false)
  })

  it('counts a number as a word without allowNumber', () => {
    expect(
      isWithinWordLimit('25 May', { maxWords: 1, allowNumber: false })
    ).toBe(false)
    expect(isWithinWordLimit('anything', null)).toBe(true)
  })
})

describe('band tables', () => {
  it.each([
    [LISTENING_BANDS, 40, 9],
    [LISTENING_BANDS, 39, 9],
    [LISTENING_BANDS, 38, 8.5],
    [LISTENING_BANDS, 30, 7],
    [LISTENING_BANDS, 29, 6.5],
    [LISTENING_BANDS, 23, 6],
    [LISTENING_BANDS, 22, 5.5],
    [LISTENING_BANDS, 0, 0],
    [ACADEMIC_READING_BANDS, 33, 7.5],
    [ACADEMIC_READING_BANDS, 32, 7],
    [ACADEMIC_READING_BANDS, 27, 6.5],
    [ACADEMIC_READING_BANDS, 26, 6],
    [ACADEMIC_READING_BANDS, 15, 5],
    [GENERAL_READING_BANDS, 40, 9],
    [GENERAL_READING_BANDS, 39, 8.5],
    [GENERAL_READING_BANDS, 34, 7],
    [GENERAL_READING_BANDS, 30, 6],
    [GENERAL_READING_BANDS, 29, 5.5],
  ])('raw %#', (table, raw, band) => {
    expect(rawToBand(table, raw)).toBe(band)
  })

  it('every table covers 0..40 with non-increasing bands', () => {
    for (const table of [
      LISTENING_BANDS,
      ACADEMIC_READING_BANDS,
      GENERAL_READING_BANDS,
    ]) {
      let previous = 9

      for (let raw = 40; raw >= 0; raw--) {
        const band = rawToBand(table, raw)

        expect(band).toBeLessThanOrEqual(previous)
        previous = band
      }
    }
  })
})

describe('rounding', () => {
  it.each([
    [6.0, 6],
    [6.124, 6],
    [6.25, 6.5],
    [6.74, 6.5],
    [6.75, 7],
    [6.875, 7],
  ])('overall %d -> %d', (value, band) => {
    expect(roundOverallBand(value)).toBe(band)
  })

  it('floors a task band to a half band', () => {
    expect(roundTaskBand([6, 6, 7, 6])).toBe(6)
    expect(roundTaskBand([7, 6, 7, 6])).toBe(6.5)
    expect(roundTaskBand([7, 7, 7, 6])).toBe(6.5)
    expect(roundTaskBand([])).toBe(0)
  })

  it('weights Task 2 twice', () => {
    // (5 + 2 * 8) / 3 = 7, where a plain mean would give 6.5
    expect(writingBand(5, 8)).toBe(7)
    // (6 + 14) / 3 = 6.67 and (7 + 12) / 3 = 6.33 both round to 6.5
    expect(writingBand(6, 7)).toBe(6.5)
    expect(writingBand(7, 6)).toBe(6.5)
  })
})

const KEY: IeltsAnswerKey = {
  questions: [
    {
      number: 1,
      part: 1,
      type: 'note-completion',
      accepted: ['10', 'ten'],
      isText: true,
      wordLimit: { maxWords: 1, allowNumber: true },
    },
    {
      number: 2,
      part: 1,
      type: 'note-completion',
      accepted: ['volunteers'],
      isText: true,
      wordLimit: { maxWords: 2, allowNumber: false },
    },
    {
      number: 3,
      part: 1,
      type: 'true-false-not-given',
      accepted: ['NOT GIVEN'],
      isText: false,
      wordLimit: null,
    },
    {
      number: 6,
      part: 2,
      type: 'multiple-choice',
      accepted: ['B'],
      isText: false,
      wordLimit: null,
    },
  ],
  groups: [
    {
      part: 2,
      type: 'multiple-choice-multi',
      numbers: [4, 5],
      correctKeys: ['A', 'D'],
    },
  ],
}

describe('scoreObjective', () => {
  it('scores text, keys, blanks and parts', () => {
    const result = scoreObjective(KEY, {
      '1': 'Ten',
      '2': 'local volunteers',
      '3': 'not given',
      '4': ['D', 'C'],
    })

    expect(result.raw).toBe(3)
    expect(result.total).toBe(6)
    expect(result.perQuestion.map(row => [row.number, row.outcome])).toEqual([
      [1, 'correct'],
      [2, 'wrong'],
      [3, 'correct'],
      [4, 'correct'],
      [5, 'wrong'],
      [6, 'blank'],
    ])
    expect(result.perPart).toEqual([
      { part: 1, raw: 2, total: 3 },
      { part: 2, raw: 1, total: 3 },
    ])
  })

  it('marks a right answer over the word limit as wrong', () => {
    const result = scoreObjective(
      {
        questions: [
          {
            ...KEY.questions[1],
            accepted: ['local volunteers'],
            wordLimit: { maxWords: 1, allowNumber: false },
          },
        ],
        groups: [],
      },
      { '2': 'local volunteers' }
    )

    expect(result.perQuestion[0]).toMatchObject({
      outcome: 'wrong',
      overLimit: true,
    })
  })

  it('scores choose-TWO as a set, ignoring order, duplicates and extras', () => {
    const score = (given: string[]) =>
      scoreObjective({ questions: [], groups: KEY.groups }, { '4': given }).raw

    expect(score(['D', 'A'])).toBe(2)
    expect(score(['A', 'A'])).toBe(1)
    expect(score(['B', 'C', 'A'])).toBe(0)
    expect(score([])).toBe(0)
  })
})

describe('overallEstimate', () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 28, 10, minute))

  it('prefers a full mock session, then a test, then mixed', () => {
    expect(
      overallEstimate([
        {
          skill: 'listening',
          band: 6,
          testId: 't1',
          testVersion: 1,
          sessionId: 's1',
          scoredAt: at(1),
        },
        {
          skill: 'reading',
          band: 7,
          testId: 't1',
          testVersion: 1,
          sessionId: 's1',
          scoredAt: at(2),
        },
        {
          skill: 'reading',
          band: 5,
          testId: 't2',
          testVersion: 1,
          sessionId: null,
          scoredAt: at(3),
        },
      ])
    ).toEqual({ band: 6.5, skills: ['listening', 'reading'], basis: 'session' })

    expect(
      overallEstimate([
        {
          skill: 'listening',
          band: 6,
          testId: 't1',
          testVersion: 1,
          sessionId: null,
          scoredAt: at(1),
        },
        {
          skill: 'reading',
          band: 8,
          testId: 't2',
          testVersion: 1,
          sessionId: null,
          scoredAt: at(2),
        },
      ])
    ).toMatchObject({ band: 7, basis: 'mixed' })

    expect(overallEstimate([])).toBeNull()
  })
})
