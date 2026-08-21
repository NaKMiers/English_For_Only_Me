import { describe, expect, it } from 'vitest'

import {
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_FAMILIES,
  GRAMMAR_L1_RISKS,
} from '@/modules/grammar/constants'

import {
  CREATURE_SPECIES,
  creatureFromPoint,
  resolveMenaceTier,
} from './creatureFromPoint'

function point(
  overrides: Partial<Parameters<typeof creatureFromPoint>[0]['point']> = {}
) {
  return {
    complexity: 3 as const,
    family: 'articles-determiners' as const,
    l1Risk: 'medium' as const,
    title: 'The Definite Article',
    ...overrides,
  }
}

describe('CREATURE_SPECIES', () => {
  it('covers all 17 families', () => {
    for (const family of GRAMMAR_FAMILIES)
      expect(CREATURE_SPECIES[family], family).toBeTruthy()
  })

  it('gives each family a distinct species', () => {
    // A shared drawing would make two families indistinguishable in the
    // bestiary, which is the one thing the bestiary is for.
    expect(new Set(Object.values(CREATURE_SPECIES)).size).toBe(
      GRAMMAR_FAMILIES.length
    )
  })
})

describe('resolveMenaceTier', () => {
  it('stays within 1 and 5 for every real combination', () => {
    for (const complexity of GRAMMAR_COMPLEXITY_LEVELS)
      for (const l1Risk of GRAMMAR_L1_RISKS) {
        const tier = resolveMenaceTier({ complexity, l1Risk })

        expect(tier, `${complexity}/${l1Risk}`).toBeGreaterThanOrEqual(1)
        expect(tier, `${complexity}/${l1Risk}`).toBeLessThanOrEqual(5)
      }
  })

  /**
   * The whole argument for the two-axis taxonomy, expressed as a drawing.
   * Complexity alone would make articles a starter creature and future perfect
   * continuous the final boss - exactly backwards for a Vietnamese speaker.
   */
  it('draws a low-level high-risk point as more dangerous than a high-level low-risk one', () => {
    const articles = resolveMenaceTier({ complexity: 5, l1Risk: 'high' })
    const mechanical = resolveMenaceTier({ complexity: 3, l1Risk: 'low' })

    expect(articles).toBeGreaterThan(mechanical)
  })

  it('rises with risk at equal complexity', () => {
    expect(
      resolveMenaceTier({ complexity: 3, l1Risk: 'high' })
    ).toBeGreaterThan(resolveMenaceTier({ complexity: 3, l1Risk: 'low' }))
  })

  it('rises with complexity at equal risk', () => {
    expect(
      resolveMenaceTier({ complexity: 5, l1Risk: 'medium' })
    ).toBeGreaterThan(resolveMenaceTier({ complexity: 1, l1Risk: 'medium' }))
  })

  it('reads the observed judgment', () => {
    expect(
      resolveMenaceTier({
        complexity: 2,
        l1Risk: 'low',
        l1RiskObserved: 'high',
      })
    ).toBeGreaterThan(resolveMenaceTier({ complexity: 2, l1Risk: 'low' }))
  })

  it('reaches the top tier for the worst points', () => {
    // If nothing ever reaches 5, the top of the range is decoration.
    expect(resolveMenaceTier({ complexity: 5, l1Risk: 'high' })).toBe(5)
  })

  it('reaches the bottom tier for the easiest points', () => {
    expect(resolveMenaceTier({ complexity: 1, l1Risk: 'low' })).toBe(1)
  })
})

describe('creatureFromPoint', () => {
  it('flags high effective risk as dangerous', () => {
    expect(
      creatureFromPoint({ point: point({ l1Risk: 'high' }), recallStage: null })
        .isDangerous
    ).toBe(true)
    expect(
      creatureFromPoint({
        point: point({ l1Risk: 'low', l1RiskObserved: 'high' }),
        recallStage: null,
      }).isDangerous
    ).toBe(true)
    expect(
      creatureFromPoint({ point: point({ l1Risk: 'low' }), recallStage: null })
        .isDangerous
    ).toBe(false)
  })

  describe('accessible name', () => {
    // Everything the drawing says has to be readable without seeing it. This is
    // assembled next to the spec so the two cannot drift apart.
    it('names the point, the family, the stage and the interference', () => {
      const spec = creatureFromPoint({
        point: point({ l1Risk: 'high' }),
        recallStage: 4,
      })

      expect(spec.accessibleName).toContain('The Definite Article')
      expect(spec.accessibleName).toContain('Articles & Determiners')
      expect(spec.accessibleName).toContain('stage 4 of 7')
      expect(spec.accessibleName).toContain('high interference')
    })

    it('says untouched rather than a stage the learner has not reached', () => {
      expect(
        creatureFromPoint({ point: point(), recallStage: null }).accessibleName
      ).toContain('untouched')
    })

    it('reports the observed interference, matching what is drawn', () => {
      expect(
        creatureFromPoint({
          point: point({ l1Risk: 'low', l1RiskObserved: 'high' }),
          recallStage: 1,
        }).accessibleName
      ).toContain('high interference')
    })
  })

  it('builds a complete spec for every family at every tier', () => {
    for (const family of GRAMMAR_FAMILIES)
      for (const complexity of GRAMMAR_COMPLEXITY_LEVELS)
        for (const l1Risk of GRAMMAR_L1_RISKS) {
          const spec = creatureFromPoint({
            point: { complexity, family, l1Risk, title: 'A Point' },
            recallStage: null,
          })

          expect(spec.species, family).toBeTruthy()
          expect(spec.accessibleName.length).toBeGreaterThan(0)
        }
  })
})
