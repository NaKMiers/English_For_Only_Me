import { describe, expect, test } from 'vitest'

import { buildDictationCorrection } from './compareAnswer'

function compare(typedAnswer: string, expectedText: string) {
  return buildDictationCorrection({
    action: 'check',
    expectedText,
    typedAnswer,
  })
}

describe('buildDictationCorrection', () => {
  test('passes capitalization and punctuation forgiving cases', () => {
    const result = compare('we are ready now', 'We are ready now.')

    expect(result.isPassed).toBe(true)
    expect(result.stats.accuracy).toBe(100)
  })

  test('passes contractions when words match after expansion', () => {
    expect(compare("I'm ready", 'I am ready.').isPassed).toBe(true)
    expect(compare('They are not late', "They aren't late.").isPassed).toBe(
      true
    )
  })

  test('passes number and British/American variants', () => {
    expect(
      compare('The 2nd colour is grey', 'The second color is gray').isPassed
    ).toBe(true)
  })

  test('classifies missing, extra, and wrong words', () => {
    const missing = compare('I want coffee', 'I want some coffee')
    const extra = compare('I really want coffee', 'I want coffee')
    const wrong = compare('I want tea', 'I want coffee')

    expect(missing.isPassed).toBe(false)
    expect(missing.feedbackTokens.map(token => token.status)).toContain(
      'missing'
    )
    expect(extra.isPassed).toBe(false)
    expect(extra.feedbackTokens.map(token => token.status)).toContain('extra')
    expect(wrong.isPassed).toBe(false)
    expect(wrong.feedbackTokens.map(token => token.status)).toContain('wrong')
  })

  test('classifies near misspellings without passing', () => {
    const result = compare('I want coffe', 'I want coffee')

    expect(result.isPassed).toBe(false)
    expect(result.feedbackTokens.map(token => token.status)).toContain(
      'spellingVariant'
    )
  })

  test('records reveal and skip as explicit non-passing attempt actions', () => {
    const reveal = buildDictationCorrection({
      action: 'reveal',
      expectedText: 'Keep listening carefully.',
      typedAnswer: '',
    })
    const skip = buildDictationCorrection({
      action: 'skip',
      expectedText: 'Keep listening carefully.',
      typedAnswer: 'keep',
    })

    expect(reveal.isPassed).toBe(false)
    expect(reveal.stats.missingCount).toBe(3)
    expect(skip.isPassed).toBe(false)
    expect(skip.action).toBe('skip')
  })
})
