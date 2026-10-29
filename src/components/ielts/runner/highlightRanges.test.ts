import { describe, expect, it } from 'vitest'

import { expandToWords, mergeSpans, removeOverlapping } from './highlightRanges'

const TEXT = 'Noise affects our well-being, they’re saying.'

describe('expandToWords', () => {
  it('grows a partial selection to the whole word', () => {
    const [start, end] = expandToWords(TEXT, 2, 4) ?? [0, 0]

    expect(TEXT.slice(start, end)).toBe('Noise')
  })

  it('keeps hyphenated words and contractions whole', () => {
    const span = expandToWords(TEXT, TEXT.indexOf('being'), TEXT.indexOf(','))
    const quote = expandToWords(
      TEXT,
      TEXT.indexOf('re'),
      TEXT.indexOf('re') + 1
    )

    expect(span && TEXT.slice(...span)).toBe('well-being')
    expect(quote && TEXT.slice(...quote)).toBe('they’re')
  })

  it('does not swallow the next word when the selection ends on a space', () => {
    const start = TEXT.indexOf('affects')
    const span = expandToWords(TEXT, start, start + 'affects '.length)

    expect(span && TEXT.slice(...span)).toBe('affects')
  })

  it('returns null for a selection of only spaces or punctuation', () => {
    expect(expandToWords(TEXT, 28, 30)).toBeNull()
  })
})

describe('mergeSpans and removeOverlapping', () => {
  it('merges overlapping and touching spans', () => {
    expect(
      mergeSpans([
        [10, 14],
        [0, 5],
        [5, 8],
        [12, 20],
      ])
    ).toEqual([
      [0, 8],
      [10, 20],
    ])
  })

  it('clears whole highlights that the selection touches', () => {
    expect(
      removeOverlapping(
        [
          [0, 5],
          [10, 20],
        ],
        [15, 16]
      )
    ).toEqual([[0, 5]])
  })
})
