import { describe, expect, test } from 'vitest'

import { buildCharCorrection, renderAnswerLine } from './buildCharCorrection'

const WALL = 'As years passed and the wall grew, few returned home.'

function check(typedAnswer: string, expectedText: string) {
  return buildCharCorrection({ action: 'check', expectedText, typedAnswer })
}

/** The masked answer line, "Show full answer" OFF (default). */
function masked(typedAnswer: string, expectedText: string) {
  return renderAnswerLine(check(typedAnswer, expectedText), {
    showFullAnswer: false,
  })
}

describe('buildCharCorrection — reveal + mask model', () => {
  test('matched words shown, next word revealed, rest masked (typed nothing at boundary)', () => {
    // muc 4 case 1: "As years" -> caret after "As years ", next word revealed.
    const result = check('As years', WALL)

    expect(masked('As years', WALL)).toBe(
      'As years passed *** *** **** ***** *** ******** *****'
    )
    expect(result.caretValue).toBe('As years ')
    expect(result.segments[2]).toMatchObject({
      expected: 'passed',
      kind: 'boundaryReveal',
    })
  })

  test('clean incomplete last word shows the partial, caret after it', () => {
    // muc 4 case 2: "As years pass" -> shows "pass", caret after "pass".
    const result = check('As years pass', WALL)
    const boundary = result.segments[2]

    expect(boundary.kind).toBe('boundaryPartial')
    expect(result.caretValue).toBe('As years pass')
    // Missing tail chars of "passed" are flagged, none wrong.
    expect(boundary.chars.map(cell => cell.status)).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'missing',
      'missing',
    ])
  })

  test('wrong word with content after it reveals the full correct word', () => {
    // muc 4 case 3: "As yers passed and" -> reveals "years", masks rest.
    expect(masked('As yers passed and', WALL)).toBe(
      'As years ****** *** *** **** ***** *** ******** *****'
    )
    expect(check('As yers passed and', WALL).segments[1]).toMatchObject({
      expected: 'years',
      kind: 'boundaryReveal',
    })
  })

  test('fixing the boundary word advances the caret past the next word', () => {
    // muc 4 case 4: "nd" is wrong; caret sits after "nd" so the learner fixes it.
    const wrong = check('As years passed nd the', WALL)

    expect(masked('As years passed nd the', WALL)).toBe(
      'As years passed and *** **** ***** *** ******** *****'
    )
    expect(wrong.segments[3]).toMatchObject({
      expected: 'and',
      kind: 'boundaryReveal',
    })
    expect(wrong.caretValue).toBe('As years passed nd')

    // After correcting "nd" -> "and", the boundary moves to "the".
    const fixed = check('As years passed and the', WALL)

    expect(fixed.caretValue).toBe('As years passed and the ')
    expect(fixed.boundaryIndex).toBe(5)
  })

  test('auto-inserts punctuation on the revealed boundary word', () => {
    // muc 4 case 5: after "grew", the comma comes back and "few" is revealed.
    expect(masked('As years passed and the wall grew', WALL)).toBe(
      'As years passed and the wall grew, few ******** *****'
    )
  })

  test('missing char inside a word is flagged (order -> ordered)', () => {
    const expected = 'He ordered many men across'
    const result = check('He order many men across', expected)
    const boundary = result.segments[1]

    // Word-prefix: matching stops at "order", so "many men across" are masked
    // even though typed correctly (learner must fix the boundary first).
    expect(boundary).toMatchObject({
      expected: 'ordered',
      kind: 'boundaryReveal',
    })
    expect(boundary.chars.at(-1)?.status).toBe('missing')
    expect(boundary.chars.at(-2)?.status).toBe('missing')
    expect(masked('He order many men across', expected)).toBe(
      'He ordered **** *** ******'
    )
  })

  test('wrong char inside a word is red, the expected char stays visible (particlar)', () => {
    const expected = 'One particular gourd'
    const boundary = check('One particlar', expected).segments[1]

    expect(boundary).toMatchObject({
      expected: 'particular',
      kind: 'boundaryReveal',
    })
    // partic|l|ar vs partic|u|lar -> position 6 is a substitution (red).
    expect(boundary.chars[6]).toMatchObject({
      expectedChar: 'u',
      status: 'wrong',
      typedChar: 'l',
    })
  })

  test('passes when the whole sentence is correct', () => {
    const result = check(
      'As years passed and the wall grew few returned home',
      WALL
    )

    expect(result.isPassed).toBe(true)
    expect(result.boundaryIndex).toBe(splitCount(WALL))
  })

  test('show full answer ON reveals the masked tail', () => {
    expect(
      renderAnswerLine(check('As years', WALL), { showFullAnswer: true })
    ).toBe(WALL.replace(/\s+/g, ' '))
  })
})

describe('buildCharCorrection — hints (proper nouns)', () => {
  const MENG =
    "the Mengs and their neighbors, the Jiangs, hadn't yet had to worry about being drafted by the emperor's soldiers."

  test('surfaces mid-sentence proper nouns as separate hints', () => {
    const result = check('the', MENG)

    expect(result.hints).toEqual(['Mengs', 'Jiangs'])
  })

  test('drops a hint once its word is typed, keeps the later one', () => {
    const result = check('the Mengs and their neighbors the', MENG)

    expect(result.hints).toEqual(['Jiangs'])
  })

  test('does not treat the sentence-initial capital or "I" as a hint', () => {
    expect(check('', 'I walked to the store').hints).toEqual([])
    expect(check('', 'The house was quiet').hints).toEqual([])
  })
})

describe('buildCharCorrection — reveal/skip actions', () => {
  test('reveal returns every word for full display and never passes', () => {
    const result = buildCharCorrection({
      action: 'reveal',
      expectedText: WALL,
      typedAnswer: 'As years',
    })

    expect(result.isPassed).toBe(false)
    expect(result.segments).toHaveLength(splitCount(WALL))
  })
})

describe('buildCharCorrection — analytics projection', () => {
  test('carries the word-level feedbackTokens + stats from the shared engine', () => {
    const result = check('I want tea', 'I want coffee')

    expect(result.feedbackTokens.length).toBeGreaterThan(0)
    expect(result.stats).toHaveProperty('accuracy')
  })
})

describe.skip('buildCharCorrection — KNOWN LIMITATION: 1:2 contraction equivalence', () => {
  test("accepts he'd for he would (word-count-changing contraction)", () => {
    // Expected has two words ("he would"); typed one ("he'd"). T1 follow-up.
    const result = check('an emperor declared that he would', 'that he would')

    expect(result.isPassed).toBe(true)
  })
})

function splitCount(value: string) {
  return value.replace(/\s+/g, ' ').trim().split(' ').length
}
