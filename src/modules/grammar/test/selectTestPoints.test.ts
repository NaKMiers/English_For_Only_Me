import { describe, expect, it } from 'vitest'

import { selectTestPoints } from './selectTestPoints'
import type { GrammarTestCandidate, GrammarTestConfig } from './types'

function candidate(
  overrides: Partial<GrammarTestCandidate> = {}
): GrammarTestCandidate {
  return {
    cefrLevel: 'A2',
    commonMistakes: [],
    complexity: 2,
    drills: [],
    family: 'verb-tenses',
    formPatterns: [],
    l1Risk: 'medium',
    l1RiskObserved: null,
    reviewStatus: 'unverified',
    slug: 'present-perfect',
    status: null,
    summary: 'Links a past action to now.',
    title: 'Present Perfect',
    ...overrides,
  }
}

function config(overrides: Partial<GrammarTestConfig> = {}): GrammarTestConfig {
  return {
    cefrLevels: [],
    complexities: [],
    families: [],
    l1Risks: [],
    questionCount: 10,
    scope: 'all',
    ...overrides,
  }
}

describe('selectTestPoints', () => {
  describe('empty filters mean no constraint', () => {
    it('selects everything when nothing is chosen', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ slug: 'a' }),
          candidate({ slug: 'b' }),
          candidate({ slug: 'c' }),
        ],
        config: config(),
      })

      expect(result.points).toHaveLength(3)
      expect(result.shortfall).toBe(7)
    })

    it('does not select nothing when every filter is empty', () => {
      // The inverted reading of "empty" would make the default configuration
      // return an empty test, which is the most likely way to get this wrong.
      const result = selectTestPoints({
        candidates: [candidate()],
        config: config({
          cefrLevels: [],
          complexities: [],
          families: [],
          l1Risks: [],
        }),
      })

      expect(result.points).toHaveLength(1)
    })
  })

  describe('filters', () => {
    it('filters by CEFR level', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ cefrLevel: 'A1', slug: 'a1' }),
          candidate({ cefrLevel: 'C1', slug: 'c1' }),
        ],
        config: config({ cefrLevels: ['C1'] }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['c1'])
    })

    it('filters by family', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ family: 'articles-determiners', slug: 'art' }),
          candidate({ family: 'conditionals', slug: 'cond' }),
        ],
        config: config({ families: ['conditionals'] }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['cond'])
    })

    it('filters by complexity', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ complexity: 1, slug: 'easy' }),
          candidate({ complexity: 5, slug: 'hard' }),
        ],
        config: config({ complexities: [5] }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['hard'])
    })

    it('filters by the EFFECTIVE l1 risk, not the authored one', () => {
      // A point re-judged by the builder must be filtered by that judgment.
      // Filtering on the raw `l1Risk` would make the observed value decorative.
      const result = selectTestPoints({
        candidates: [
          candidate({
            l1Risk: 'low',
            l1RiskObserved: 'high',
            slug: 'rejudged',
          }),
          candidate({
            l1Risk: 'high',
            l1RiskObserved: 'low',
            slug: 'softened',
          }),
        ],
        config: config({ l1Risks: ['high'] }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['rejudged'])
    })

    it('intersects filters rather than unioning them', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ cefrLevel: 'B2', family: 'conditionals', slug: 'both' }),
          candidate({ cefrLevel: 'B2', family: 'passive', slug: 'level-only' }),
          candidate({
            cefrLevel: 'A1',
            family: 'conditionals',
            slug: 'fam-only',
          }),
        ],
        config: config({ cefrLevels: ['B2'], families: ['conditionals'] }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['both'])
    })
  })

  describe('scopes', () => {
    const pool = [
      candidate({ slug: 'untouched', status: null }),
      candidate({ slug: 'learning', status: 'learning' }),
      candidate({ slug: 'mastered', status: 'mastered' }),
      candidate({ slug: 'known', status: 'alreadyKnow' }),
    ]

    it('all draws from everything except ignored', () => {
      const result = selectTestPoints({
        candidates: pool,
        config: config({ scope: 'all' }),
      })

      expect(result.points).toHaveLength(4)
    })

    it('learning draws only from learning', () => {
      const result = selectTestPoints({
        candidates: pool,
        config: config({ scope: 'learning' }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['learning'])
    })

    it('untouched draws only from points with no item row', () => {
      const result = selectTestPoints({
        candidates: pool,
        config: config({ scope: 'untouched' }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['untouched'])
    })

    it('mastered draws only from mastered', () => {
      const result = selectTestPoints({
        candidates: pool,
        config: config({ scope: 'mastered' }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['mastered'])
    })

    it('due draws from the caller-supplied due set', () => {
      const result = selectTestPoints({
        candidates: pool,
        config: config({ scope: 'due' }),
        dueSlugs: new Set(['learning']),
      })

      expect(result.points.map(point => point.slug)).toEqual(['learning'])
    })
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * `ignored` means the learner said stop showing me this. It is the only status
   * that is an instruction rather than an observation. If a test could draw from
   * it, one wrong answer would set the point back to `learning` and put it
   * straight back in the daily queue - the app overruling an explicit choice.
   */
  describe('ignored points (regression guard)', () => {
    it('excludes ignored from every scope, including all', () => {
      for (const scope of [
        'all',
        'learning',
        'due',
        'untouched',
        'mastered',
      ] as const) {
        const result = selectTestPoints({
          candidates: [candidate({ slug: 'silenced', status: 'ignored' })],
          config: config({ scope }),
          dueSlugs: new Set(['silenced']),
        })

        expect(result.points).toHaveLength(0)
      }
    })

    it('excludes ignored even when it matches every filter', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({
            cefrLevel: 'B1',
            complexity: 3,
            family: 'modals',
            l1Risk: 'high',
            slug: 'silenced',
            status: 'ignored',
          }),
        ],
        config: config({
          cefrLevels: ['B1'],
          complexities: [3],
          families: ['modals'],
          l1Risks: ['high'],
        }),
      })

      expect(result.points).toHaveLength(0)
    })
  })

  describe('ranking and count', () => {
    it('spends questions on the highest-risk points first', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ l1Risk: 'low', slug: 'low' }),
          candidate({ l1Risk: 'high', slug: 'high' }),
          candidate({ l1Risk: 'medium', slug: 'medium' }),
        ],
        config: config({ questionCount: 2 }),
      })

      expect(result.points.map(point => point.slug)).toEqual(['high', 'medium'])
    })

    it('breaks risk ties on complexity, then on slug', () => {
      const result = selectTestPoints({
        candidates: [
          candidate({ complexity: 1, slug: 'b-simple' }),
          candidate({ complexity: 4, slug: 'z-complex' }),
          candidate({ complexity: 1, slug: 'a-simple' }),
        ],
        config: config(),
      })

      expect(result.points.map(point => point.slug)).toEqual([
        'z-complex',
        'a-simple',
        'b-simple',
      ])
    })

    it('is reproducible for the same configuration', () => {
      const pool = Array.from({ length: 20 }, (_, index) =>
        candidate({ slug: `point-${index}` })
      )
      const first = selectTestPoints({ candidates: pool, config: config() })
      const second = selectTestPoints({ candidates: pool, config: config() })

      expect(first.points.map(point => point.slug)).toEqual(
        second.points.map(point => point.slug)
      )
    })

    it('never returns more than asked for', () => {
      const result = selectTestPoints({
        candidates: Array.from({ length: 50 }, (_, index) =>
          candidate({ slug: `p${index}` })
        ),
        config: config({ questionCount: 5 }),
      })

      expect(result.points).toHaveLength(5)
      expect(result.shortfall).toBe(0)
    })

    it('reports the shortfall rather than silently returning fewer', () => {
      const result = selectTestPoints({
        candidates: [candidate({ slug: 'only' })],
        config: config({ questionCount: 20 }),
      })

      expect(result.points).toHaveLength(1)
      expect(result.shortfall).toBe(19)
    })

    it('returns an empty selection when nothing matches', () => {
      const result = selectTestPoints({
        candidates: [candidate({ cefrLevel: 'A1' })],
        config: config({ cefrLevels: ['C2'] }),
      })

      expect(result.points).toHaveLength(0)
      expect(result.shortfall).toBe(10)
    })
  })
})
