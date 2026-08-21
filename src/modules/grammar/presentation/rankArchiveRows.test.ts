import { describe, expect, it } from 'vitest'

import {
  pickArchiveQuote,
  rankArchiveRows,
  type ArchiveCandidate,
} from './rankArchiveRows'

function row(overrides: Partial<ArchiveCandidate> = {}): ArchiveCandidate {
  return {
    cefrLevel: 'B1',
    family: 'verb-tenses',
    isUnverified: true,
    l1RiskRank: 2,
    pointSlug: 'a-point',
    recallStage: 3,
    title: 'A Point',
    wrongCount: 1,
    ...overrides,
  }
}

describe('rankArchiveRows', () => {
  it('puts the most-failed rule first', () => {
    const ranked = rankArchiveRows([
      row({ pointSlug: 'few', wrongCount: 2 }),
      row({ pointSlug: 'many', wrongCount: 9 }),
    ])

    expect(ranked.map(entry => entry.pointSlug)).toEqual(['many', 'few'])
  })

  it('breaks an equal wrong count on the lowest ladder stage', () => {
    // A rule you are still failing outranks one you failed often and have
    // since beaten.
    const ranked = rankArchiveRows([
      row({ pointSlug: 'beaten', recallStage: 6, wrongCount: 5 }),
      row({ pointSlug: 'still-failing', recallStage: 1, wrongCount: 5 }),
    ])

    expect(ranked[0].pointSlug).toBe('still-failing')
  })

  it('then prefers the rule the first language is fighting', () => {
    const ranked = rankArchiveRows([
      row({ l1RiskRank: 1, pointSlug: 'easy', recallStage: 2, wrongCount: 4 }),
      row({
        l1RiskRank: 3,
        pointSlug: 'brutal',
        recallStage: 2,
        wrongCount: 4,
      }),
    ])

    expect(ranked[0].pointSlug).toBe('brutal')
  })

  it('is stable across visits', () => {
    // A list that reshuffles itself for no reason reads as noise rather than
    // as a record of what has happened to you.
    const rows = [
      row({ pointSlug: 'b' }),
      row({ pointSlug: 'a' }),
      row({ pointSlug: 'c' }),
    ]

    expect(rankArchiveRows(rows).map(entry => entry.pointSlug)).toEqual(
      rankArchiveRows([...rows].reverse()).map(entry => entry.pointSlug)
    )
  })

  it('does not mutate its input', () => {
    const rows = [
      row({ pointSlug: 'a' }),
      row({ pointSlug: 'b', wrongCount: 9 }),
    ]

    rankArchiveRows(rows)

    expect(rows[0].pointSlug).toBe('a')
  })

  it('handles an empty archive', () => {
    expect(rankArchiveRows([])).toEqual([])
  })
})

describe('pickArchiveQuote', () => {
  const trap = {
    occurrences: 4,
    prompt: 'I ate ___ durian.',
    userAnswer: 'a durian',
  }
  const first = {
    prompt: 'She works in ___ hospital.',
    userAnswer: 'a hospital',
  }

  it('prefers the repeated mistake over the first one', () => {
    // A pattern says more about a learner than a slip does.
    expect(
      pickArchiveQuote({ firstWrong: first, worstTrap: trap })?.userAnswer
    ).toBe('a durian')
  })

  it('falls back to the first mistake when there is no pattern yet', () => {
    const quote = pickArchiveQuote({ firstWrong: first, worstTrap: null })

    expect(quote?.userAnswer).toBe('a hospital')
    expect(quote?.occurrences).toBe(1)
  })

  it('returns nothing rather than inventing something to show', () => {
    expect(pickArchiveQuote({ firstWrong: null, worstTrap: null })).toBeNull()
    expect(pickArchiveQuote(null)).toBeNull()
  })

  it('carries a null prompt through rather than substituting one', () => {
    // The drill was regenerated away. The answer is still the learner's.
    expect(
      pickArchiveQuote({
        firstWrong: null,
        worstTrap: { ...trap, prompt: null },
      })
    ).toMatchObject({ prompt: null, userAnswer: 'a durian' })
  })
})
