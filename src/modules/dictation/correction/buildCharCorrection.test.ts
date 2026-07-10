import { describe, expect, test } from 'vitest'

import {
  autoCorrectAnswer,
  buildCharCorrection,
  renderAnswerLine,
} from './buildCharCorrection'

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

describe('buildCharCorrection - reveal + mask model', () => {
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

  test('keeps the full draft and points the caret just past the wrong word', () => {
    const expected = 'There are Kaijus with biological armour, who spit acid'
    const typed = 'There are Kaijus wh biological armour, who spit acid'
    const result = check(typed, expected)

    // The draft is NOT truncated - everything the learner typed is preserved.
    expect(result.typedValue).toBe(typed)
    // Boundary word "wh" sits at offset 17..19; caret lands right after it.
    expect(typed.slice(result.boundary!.start, result.boundary!.end)).toBe('wh')
    expect(result.caretOffset).toBe(result.boundary!.end)
    expect(typed.slice(0, result.caretOffset)).toBe('There are Kaijus wh')
  })

  test('flags only the substituted characters of the wrong word (red)', () => {
    const typed = 'the prxbably'
    const result = check(typed, 'the probably')
    const { start, wrongOffsets } = result.boundary!

    // "prxbably" vs "probably": only the 'x' (typed offset 2) is wrong.
    expect(wrongOffsets.map(offset => typed[offset])).toEqual(['x'])
    expect(wrongOffsets).toEqual([start + 2])
  })

  test('caret sits at the end when nothing was typed at the boundary', () => {
    const result = check('As years', WALL)

    expect(result.boundary).toBeNull()
    expect(result.caretOffset).toBe('As years'.length)
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

describe('autoCorrectAnswer', () => {
  const KAIJU =
    'There are Kaijus with biological armour, who spit acid, shoot living harpoons, and eat their victims alive – and yet you have probably never heard of any of them: The Unhinged Super Predators of the Microworld'

  test('fixes case, punctuation and whitespace up to where the learner typed', () => {
    const typed =
      'there are kaijus    with    biological armour  who spit acid  shoot living harpoons  and eat their    viCTims alivE And yet you have probably never heard of any OF    them'

    // Ends "them: " with a trailing space since a word ("The") still follows.
    expect(autoCorrectAnswer(KAIJU, typed)).toBe(
      'There are Kaijus with biological armour, who spit acid, shoot living harpoons, and eat their victims alive – and yet you have probably never heard of any of them: '
    )
  })

  test('auto-inserts a standalone punctuation token then a trailing space', () => {
    const typed =
      'There are Kaijus with biological armour, who spit acid, shoot living harpoons, and eat their victims alive'

    // After "alive" the expected has a lone "–" then "and": fill the "–" and
    // park a trailing space for the next word.
    expect(autoCorrectAnswer(KAIJU, typed)).toBe(
      'There are Kaijus with biological armour, who spit acid, shoot living harpoons, and eat their victims alive – '
    )
  })

  test('does not duplicate a punctuation token the learner typed themselves', () => {
    const typed =
      'There are Kaijus with biological armour, who spit acid, shoot living harpoons, and eat their victims alive – and yet'
    const corrected =
      'There are Kaijus with biological armour, who spit acid, shoot living harpoons, and eat their victims alive – and yet '

    // The learner typed the "–"; it is kept once, not re-inserted.
    expect(autoCorrectAnswer(KAIJU, typed)).toBe(corrected)
    // And re-checking the corrected draft is a no-op (idempotent), not "– –".
    expect(autoCorrectAnswer(KAIJU, corrected)).toBe(corrected)
  })

  test('no trailing space once the final word is typed', () => {
    expect(
      autoCorrectAnswer('The quick brown fox', 'the quick brown fox')
    ).toBe('The quick brown fox')
  })

  test('rewrites equivalent numbers and measurement units into expected form', () => {
    expect(autoCorrectAnswer('five kg', '5 kilograms')).toBe('five kg')
    expect(autoCorrectAnswer('five kg', '5kg')).toBe('five kg')
    expect(autoCorrectAnswer('5 kilograms', 'five kg')).toBe('5 kilograms')
    expect(autoCorrectAnswer('2 meters', 'two metres')).toBe('2 meters')
    expect(autoCorrectAnswer('one litre', '1 litter')).toBe('one litre')
  })

  // The de-dup is generic: any standalone punctuation token the learner types is
  // consumed once, never re-inserted, and re-checking is idempotent.
  test.each(['–', '-', '-', ':', ';', '…', '...', '•'])(
    'keeps a typed "%s" once and stays idempotent',
    mark => {
      const expected = `alpha ${mark} beta gamma`
      const corrected = autoCorrectAnswer(expected, `alpha ${mark} beta`)

      expect(corrected).toBe(`alpha ${mark} beta `)
      expect(autoCorrectAnswer(expected, corrected)).toBe(corrected)
    }
  )

  test('canonicalises the matched prefix but keeps a genuinely wrong word', () => {
    // "wh" is wrong for "with"; the matched prefix is canonicalised, and the
    // learner's remaining words are kept (whitespace-collapsed) to fix.
    expect(
      autoCorrectAnswer(
        'There are Kaijus with biological armour',
        'there are kaijus wh biological armour'
      )
    ).toBe('There are Kaijus wh biological armour')
  })

  test('leaves an already-canonical answer unchanged', () => {
    expect(autoCorrectAnswer('As years passed', 'As years passed')).toBe(
      'As years passed'
    )
  })
})

describe('buildCharCorrection - hints (proper nouns)', () => {
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

describe('buildCharCorrection - reveal/skip actions', () => {
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

describe('buildCharCorrection - analytics projection', () => {
  test('carries the word-level feedbackTokens + stats from the shared engine', () => {
    const result = check('I want tea', 'I want coffee')

    expect(result.feedbackTokens.length).toBeGreaterThan(0)
    expect(result.stats).toHaveProperty('accuracy')
  })
})

describe.skip('buildCharCorrection - KNOWN LIMITATION: 1:2 contraction equivalence', () => {
  test("accepts he'd for he would (word-count-changing contraction)", () => {
    // Expected has two words ("he would"); typed one ("he'd"). T1 follow-up.
    const result = check('an emperor declared that he would', 'that he would')

    expect(result.isPassed).toBe(true)
  })
})

function splitCount(value: string) {
  return value.replace(/\s+/g, ' ').trim().split(' ').length
}
