import type { SortOrder } from 'mongoose'
import { describe, expect, it } from 'vitest'

import { GRAMMAR_L1_RISK_RANK } from '@/modules/grammar/constants'

import type { ParsedGrammarPointsQuery } from './grammarRouteDecisions'
import {
  buildGrammarPointFilter,
  buildGrammarReviewQueueFilter,
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

describe('buildGrammarReviewQueueFilter', () => {
  it('selects written but unreviewed points, excluding merge stubs', () => {
    expect(buildGrammarReviewQueueFilter()).toEqual({
      explanation: { $ne: null },
      mergedInto: null,
      reviewStatus: 'unverified',
    })
  })
})

/**
 * Sort fixture documents the way Mongo would, given a Mongoose sort spec.
 *
 * Strings compare lexicographically and numbers numerically - which is the
 * whole point. Running fixtures through the real spec reproduces the ordering
 * the database would produce, so a spec naming the wrong field fails here
 * instead of shipping.
 */
function sortLikeMongo<T extends Record<string, unknown>>(
  docs: T[],
  spec: [string, SortOrder][]
): T[] {
  return [...docs].sort((left, right) => {
    for (const [field, direction] of spec) {
      const a = left[field]
      const b = right[field]

      let comparison = 0

      if (typeof a === 'number' && typeof b === 'number') comparison = a - b
      else if (typeof a === 'string' && typeof b === 'string')
        comparison = a < b ? -1 : a > b ? 1 : 0

      if (comparison !== 0)
        return direction === 'desc' || direction === -1
          ? -comparison
          : comparison
    }

    return 0
  })
}

/**
 * The admin review queue is capped at 30 rows, so its ORDER decides which of
 * the 184 lessons a human ever sees. It shipped sorting the raw `l1Risk` enum,
 * which put all 93 medium-risk points ahead of all 67 high-risk ones - the
 * queue existed to surface the hardest lessons and surfaced none of them.
 *
 * These assertions run against sorted RESULTS, not the shape of the sort array.
 * The comment at `getGrammarBrowseSort` says why: an array-shape assertion
 * cannot see a lexicographic string comparison.
 */
describe('review queue ordering', () => {
  const fixtures = [
    {
      cefrLevel: 'B2',
      complexity: 5,
      family: 'passive',
      l1Risk: 'medium',
      l1RiskRank: 2,
      order: 1,
      slug: 'passive-with-modals',
    },
    {
      cefrLevel: 'A1',
      complexity: 5,
      family: 'articles-determiners',
      l1Risk: 'high',
      l1RiskRank: 3,
      order: 2,
      slug: 'definite-article-the',
    },
    {
      cefrLevel: 'A2',
      complexity: 1,
      family: 'pronouns',
      l1Risk: 'low',
      l1RiskRank: 1,
      order: 3,
      slug: 'subject-pronouns',
    },
    {
      cefrLevel: 'A1',
      complexity: 3,
      family: 'nouns-quantifiers',
      l1Risk: 'high',
      l1RiskRank: 3,
      order: 4,
      slug: 'plural-regular',
    },
  ]

  it('puts a high-risk point first', () => {
    const sorted = sortLikeMongo(fixtures, getGrammarBrowseSort())

    expect(sorted[0].l1Risk).toBe('high')
  })

  it('surfaces every high-risk point before any lower-risk one', () => {
    const ranks = sortLikeMongo(fixtures, getGrammarBrowseSort()).map(
      point => point.l1RiskRank
    )

    expect(ranks).toEqual([...ranks].sort((a, b) => b - a))
  })

  it('would have hidden every high-risk point under the old sort', () => {
    // The shipped bug, reproduced. Kept so the regression above cannot pass
    // trivially: if `sortLikeMongo` stopped comparing strings the way Mongo
    // does, this assertion fails too.
    const sorted = sortLikeMongo(fixtures, [
      ['l1Risk', 'desc'],
      ['complexity', 'desc'],
    ])

    expect(sorted[0].l1Risk).toBe('medium')
  })

  it('breaks ties deterministically so the queue is stable across sittings', () => {
    const first = sortLikeMongo(fixtures, getGrammarBrowseSort())
    const second = sortLikeMongo(
      [...fixtures].reverse(),
      getGrammarBrowseSort()
    )

    expect(second.map(point => point.slug)).toEqual(
      first.map(point => point.slug)
    )
  })
})
