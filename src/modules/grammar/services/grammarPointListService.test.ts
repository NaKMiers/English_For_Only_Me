import { describe, expect, it } from 'vitest'

import { GRAMMAR_L1_RISK_RANK } from '@/modules/grammar/constants'

import type { ParsedGrammarPointsQuery } from './grammarRouteDecisions'
import {
  buildGrammarPointFilter,
  getGrammarBrowseSort,
} from './grammarPointListService'

function query(
  overrides: Partial<ParsedGrammarPointsQuery> = {}
): ParsedGrammarPointsQuery {
  return {
    cefrLevel: null,
    complexity: null,
    family: null,
    l1Risk: null,
    limit: 40,
    page: 1,
    q: null,
    reviewStatus: null,
    ...overrides,
  }
}

describe('buildGrammarPointFilter', () => {
  // Merge stubs exist only to redirect learner progress. They must never show
  // up in a browse list.
  it('always excludes merge stubs', () => {
    expect(buildGrammarPointFilter(query())).toEqual({ mergedInto: null })
  })

  it('applies each filter when present', () => {
    expect(
      buildGrammarPointFilter(
        query({
          cefrLevel: 'B1',
          complexity: 4,
          family: 'passive',
          l1Risk: 'high',
          reviewStatus: 'unverified',
        })
      )
    ).toEqual({
      cefrLevel: 'B1',
      complexity: 4,
      family: 'passive',
      l1Risk: 'high',
      mergedInto: null,
      reviewStatus: 'unverified',
    })
  })

  it('builds a case-insensitive search across title, summary, and slug', () => {
    const filter = buildGrammarPointFilter(query({ q: 'perfect' })) as {
      $or: { [key: string]: { $regex: string; $options: string } }[]
    }

    expect(filter.$or).toHaveLength(3)
    expect(filter.$or[0].title.$regex).toBe('perfect')
    expect(filter.$or[0].title.$options).toBe('i')
  })

  it('escapes regex metacharacters in the search term', () => {
    const filter = buildGrammarPointFilter(query({ q: 'a.b*c' })) as {
      $or: { title: { $regex: string } }[]
    }

    expect(filter.$or[0].title.$regex).toBe('a\\.b\\*c')
  })
})

describe('getGrammarBrowseSort', () => {
  // This ordering is the payoff of keeping level and difficulty as separate
  // axes: it surfaces low-level-but-brutal points ahead of high-level-but-easy
  // ones.
  it('sorts by l1RiskRank, then complexity, then level', () => {
    expect(getGrammarBrowseSort()).toEqual([
      ['l1RiskRank', 'desc'],
      ['complexity', 'desc'],
      ['cefrLevel', 'asc'],
      ['family', 'asc'],
      ['order', 'asc'],
    ])
  })

  /**
   * Regression guard for a bug that shipped and was only caught by running
   * against a real database.
   *
   * The sort used to be on `l1Risk`, a string enum. Mongo sorts strings
   * lexicographically, so descending gave medium > low > high and buried
   * exactly the points this ordering exists to surface. Asserting the array
   * shape did not catch it; asserting the FIELD does.
   */
  it('never sorts on the raw l1Risk string enum', () => {
    const fields = getGrammarBrowseSort().map(([field]) => field)

    expect(fields).not.toContain('l1Risk')
    expect(fields[0]).toBe('l1RiskRank')
  })

  it('sorts the risk rank descending so high risk comes first', () => {
    const [[, direction]] = getGrammarBrowseSort()

    expect(direction).toBe('desc')
  })
})

describe('L1 risk rank', () => {
  it('orders high above medium above low numerically', () => {
    // The property the string enum could not provide.
    expect(GRAMMAR_L1_RISK_RANK.high).toBeGreaterThan(
      GRAMMAR_L1_RISK_RANK.medium
    )
    expect(GRAMMAR_L1_RISK_RANK.medium).toBeGreaterThan(
      GRAMMAR_L1_RISK_RANK.low
    )
  })

  it('would have been ordered wrongly by a lexicographic sort', () => {
    // Documents exactly why the rank exists: descending string order is
    // medium, low, high - the opposite of what is wanted at the top.
    const lexicographic = ['high', 'medium', 'low'].sort().reverse()

    expect(lexicographic[0]).toBe('medium')
    expect(lexicographic).not.toEqual(['high', 'medium', 'low'])
  })
})
