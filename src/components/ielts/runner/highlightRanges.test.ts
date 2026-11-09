import { describe, expect, it } from 'vitest'

import {
  expandToWords,
  mergeSpans,
  removeOverlapping,
  sentenceAround,
  singleWordAt,
} from './highlightRanges'

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

  it('stops at a block break even with no space there', () => {
    const rows = 'complex societiesiiThe role'
    const breaks = new Set([rows.indexOf('ii'), rows.indexOf('The')])
    const end = expandToWords(rows, 10, 12, breaks)
    const start = expandToWords(rows, rows.indexOf('he'), rows.length, breaks)

    expect(end && rows.slice(...end)).toBe('societies')
    expect(start && rows.slice(...start)).toBe('The role')
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

describe('singleWordAt', () => {
  const at = (word: string) =>
    [TEXT.indexOf(word), TEXT.indexOf(word) + word.length] as [number, number]

  it('returns one word, hyphenated words and contractions included', () => {
    expect(singleWordAt(TEXT, at('Noise'))).toBe('Noise')
    expect(singleWordAt(TEXT, at('well-being'))).toBe('well-being')
    expect(singleWordAt(TEXT, at('they’re'))).toBe("they're")
  })

  it('returns null for more than one word', () => {
    expect(singleWordAt(TEXT, at('Noise affects'))).toBeNull()
  })

  it('returns null for numbers and for words split by a block break', () => {
    expect(singleWordAt('in 1990 they', [3, 7])).toBeNull()
    expect(singleWordAt('TitleBody', [0, 9], new Set([5]))).toBeNull()
  })
})

describe('sentenceAround', () => {
  const PASSAGE = 'First one. Noise affects   our\nsleep! Last one?'

  it('returns only the sentence that holds the span', () => {
    const start = PASSAGE.indexOf('affects')

    expect(sentenceAround(PASSAGE, [start, start + 7])).toBe(
      'Noise affects our'
    )
  })

  it('stops at sentence marks followed by space and at block breaks', () => {
    const start = PASSAGE.indexOf('Last')

    expect(sentenceAround(PASSAGE, [start, start + 4])).toBe('Last one?')
    expect(sentenceAround('3.5 metres tall', [4, 10])).toBe('3.5 metres tall')
    expect(sentenceAround('TitleBody text', [5, 9], new Set([5]))).toBe(
      'Body text'
    )
  })
})
