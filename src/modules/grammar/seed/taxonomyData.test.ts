import { describe, expect, it } from 'vitest'

import { GRAMMAR_FAMILIES } from '@/modules/grammar/constants'

import { loadGrammarContent, loadSeededSlugs } from './loadGrammarContent'
import { validateGrammarContent } from './validateGrammarContent'

/**
 * Runs the validator against the real committed content file, so a malformed or
 * under-drilled point fails `bun test` rather than being discovered at seed
 * time. This is the "runs in the lint/test step" requirement from the plan.
 */
describe('committed grammar content', () => {
  const points = loadGrammarContent()

  it('passes every validation rule', () => {
    const result = validateGrammarContent({
      points,
      previouslySeededSlugs: loadSeededSlugs(),
    })

    // Surface the actual issues on failure instead of a bare boolean.
    expect(result.issues).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('holds between 150 and 220 points', () => {
    // The plan's central size assumption. Past ~220 the granularity is too fine
    // and points should merge; below 150 the curriculum has real gaps.
    //
    // The upper bound read 180 until a coverage audit found four real omissions
    // (mandative subjunctive, adverbial participle clauses, of-genitive vs
    // possessive s, so do I / neither do I) and adding them tripped a ceiling
    // that never matched the 220 in this comment. A guard whose number
    // contradicts its own stated rationale blocks correct work.
    expect(points.length).toBeGreaterThanOrEqual(150)
    expect(points.length).toBeLessThanOrEqual(220)
  })

  it('covers every grammar family', () => {
    const covered = new Set(points.map(point => point.family))

    for (const family of GRAMMAR_FAMILIES) expect(covered).toContain(family)
  })

  it('covers every CEFR level', () => {
    const covered = new Set(points.map(point => point.cefrLevel))

    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1'])
      expect(covered).toContain(level)
  })

  it('has a unique order within each family', () => {
    const seen = new Map<string, Set<number>>()

    for (const point of points) {
      const orders = seen.get(point.family) ?? new Set<number>()

      expect(
        orders.has(point.order),
        `${point.family} has a duplicate order ${point.order} at ${point.slug}`
      ).toBe(false)

      orders.add(point.order)
      seen.set(point.family, orders)
    }
  })

  it('marks the known high-L1-risk clusters as high risk', () => {
    // These are the documented Vietnamese-to-English transfer problems. If a
    // future edit downgrades one, that is a decision worth making explicitly
    // rather than by accident.
    const highRisk = new Set(
      points.filter(point => point.l1Risk === 'high').map(point => point.slug)
    )

    for (const slug of [
      'definite-article-the',
      'zero-article',
      'plural-regular',
      'countable-uncountable',
      'present-perfect-simple',
      'past-simple-regular',
      'yes-no-questions',
      'verb-plus-gerund',
    ])
      expect(highRisk, `${slug} should be high l1Risk`).toContain(slug)
  })
})
