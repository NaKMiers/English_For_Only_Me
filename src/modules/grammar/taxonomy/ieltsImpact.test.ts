import { describe, expect, it } from 'vitest'

import { deriveIeltsImpact } from './ieltsImpact'

describe('deriveIeltsImpact', () => {
  it('rates high-complexity points as high impact', () => {
    expect(deriveIeltsImpact({ complexity: 4, family: 'verb-tenses' })).toBe(
      'high'
    )
    expect(deriveIeltsImpact({ complexity: 5, family: 'prepositions' })).toBe(
      'high'
    )
  })

  it('rates range families as high impact even at low complexity', () => {
    // Structure range is what caps a Writing band, independent of how hard the
    // structure is to form correctly.
    expect(
      deriveIeltsImpact({ complexity: 1, family: 'relative-clauses' })
    ).toBe('high')
    expect(deriveIeltsImpact({ complexity: 2, family: 'conditionals' })).toBe(
      'high'
    )
    expect(
      deriveIeltsImpact({ complexity: 2, family: 'word-order-inversion' })
    ).toBe('high')
    expect(deriveIeltsImpact({ complexity: 1, family: 'passive' })).toBe('high')
  })

  it('rates mid-complexity non-range points as medium', () => {
    expect(
      deriveIeltsImpact({ complexity: 3, family: 'articles-determiners' })
    ).toBe('medium')
  })

  it('rates low-complexity non-range points as low', () => {
    expect(
      deriveIeltsImpact({ complexity: 1, family: 'nouns-quantifiers' })
    ).toBe('low')
    expect(
      deriveIeltsImpact({ complexity: 2, family: 'adjectives-adverbs' })
    ).toBe('low')
  })

  it('lets the override win over the formula in both directions', () => {
    // Down: a range family the author judges unimportant for their exam.
    expect(
      deriveIeltsImpact({
        complexity: 5,
        family: 'relative-clauses',
        override: 'low',
      })
    ).toBe('low')

    // Up: plural -s is complexity 1 but the author knows it costs them marks.
    expect(
      deriveIeltsImpact({
        complexity: 1,
        family: 'nouns-quantifiers',
        override: 'high',
      })
    ).toBe('high')
  })

  it('ignores a null override and falls back to the formula', () => {
    expect(
      deriveIeltsImpact({
        complexity: 1,
        family: 'nouns-quantifiers',
        override: null,
      })
    ).toBe('low')
  })
})
