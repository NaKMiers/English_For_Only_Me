import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_FAMILIES,
} from '@/modules/grammar/constants'
import { CREATURE_SPECIES } from '@/modules/grammar/presentation/creatureFromPoint'
import type { MenaceTier } from '@/modules/grammar/presentation/types'

import { CREATURE_COMPONENTS } from './index'

const TIERS: MenaceTier[] = [1, 2, 3, 4, 5]

describe('the bestiary', () => {
  it('has a drawing for every family', () => {
    for (const family of GRAMMAR_FAMILIES)
      expect(CREATURE_COMPONENTS[family], family).toBeTypeOf('function')
  })

  it('has no drawing without a species name, and no species without a drawing', () => {
    // The two maps are keyed differently on purpose - one by family to a name,
    // one by family to a component - so this is the assertion that keeps them
    // in agreement. A mismatch would silently render the wrong creature.
    expect(Object.keys(CREATURE_COMPONENTS).sort()).toEqual(
      Object.keys(CREATURE_SPECIES).sort()
    )
  })

  it('gives every family a visually distinct body', () => {
    const silhouettes = new Set<string>()

    for (const family of GRAMMAR_FAMILIES) {
      const Species = CREATURE_COMPONENTS[family]
      const { container } = render(<Species menace={3} />)
      const body = container.querySelector('.comic-part--body')

      expect(body, family).not.toBeNull()
      silhouettes.add(body?.getAttribute('d') ?? family)
    }

    expect(silhouettes.size).toBe(GRAMMAR_FAMILIES.length)
  })

  describe('the part rig', () => {
    // `CreatureMotion` animates by querying these class names inside its own
    // subtree. A species missing a part loses that animation channel silently,
    // so the contract is asserted rather than assumed.
    /**
     * Every channel, not just the body and eyes.
     *
     * The first version of this test asserted only body and eye, and 16 of the
     * 17 species shipped with no jaw and no arms at all - so the hit sequence
     * silently animated two channels out of four on almost the whole bestiary,
     * and every test passed. Assert the full contract.
     */
    it('gives every species every animated part at every tier', () => {
      for (const family of GRAMMAR_FAMILIES)
        for (const menace of TIERS) {
          const Species = CREATURE_COMPONENTS[family]
          const { container } = render(<Species menace={menace} />)

          for (const part of ['body', 'eye', 'jaw', 'arm'])
            expect(
              container.querySelectorAll(`.comic-part--${part}`).length,
              `${family} tier ${menace} ${part}`
            ).toBeGreaterThan(0)
        }
    })

    it('gives every species a face field, so the eyes are not floating on paper', () => {
      // Without it a creature reads as a blank sheet with two dots on it. This
      // is most of what makes one look like it is looking at you.
      for (const family of GRAMMAR_FAMILIES) {
        const Species = CREATURE_COMPONENTS[family]
        const { container } = render(<Species menace={3} />)
        const filled = [...container.querySelectorAll('path')].filter(
          path => path.getAttribute('fill') === 'var(--comic-ink)'
        )

        expect(filled.length, family).toBeGreaterThan(0)
      }
    })

    it('puts transform-box on every animated part', () => {
      // Without `comic-part` (or `comic-part--jaw`) a rotation or scale pivots
      // off the viewBox origin and the creature comes apart on the first hit.
      for (const family of GRAMMAR_FAMILIES) {
        const Species = CREATURE_COMPONENTS[family]
        const { container } = render(<Species menace={5} />)

        for (const part of container.querySelectorAll(
          '[class*="comic-part--"]'
        )) {
          const className = part.getAttribute('class') ?? ''

          expect(
            className.includes('comic-part ') ||
              className.includes('comic-part--jaw'),
            `${family}: ${className}`
          ).toBe(true)
        }
      }
    })
  })

  describe('menace tiers', () => {
    it('shows a second eye from tier 4 and not before', () => {
      for (const family of GRAMMAR_FAMILIES) {
        const Species = CREATURE_COMPONENTS[family]

        expect(
          render(<Species menace={3} />).container.querySelectorAll(
            '.comic-part--eye'
          ).length,
          family
        ).toBe(1)
        expect(
          render(<Species menace={4} />).container.querySelectorAll(
            '.comic-part--eye'
          ).length,
          family
        ).toBe(2)
      }
    })

    it('adds a crest from tier 3 and not before', () => {
      for (const family of GRAMMAR_FAMILIES) {
        const Species = CREATURE_COMPONENTS[family]

        expect(
          render(<Species menace={2} />).container.querySelectorAll(
            '.comic-part--crest'
          ).length,
          family
        ).toBe(0)
        expect(
          render(<Species menace={3} />).container.querySelectorAll(
            '.comic-part--crest'
          ).length,
          family
        ).toBeGreaterThan(0)
      }
    })

    it('reads the same way across the whole bestiary', () => {
      // Menace has to be comparable between species, or the tier stops being
      // information and the learner has to learn seventeen separate scales.
      for (const menace of TIERS) {
        const crestCounts = new Set<number>()

        for (const family of GRAMMAR_FAMILIES) {
          const Species = CREATURE_COMPONENTS[family]

          crestCounts.add(
            render(<Species menace={menace} />).container.querySelectorAll(
              '.comic-part--crest'
            ).length
          )
        }

        expect(crestCounts.size, `tier ${menace}`).toBe(1)
      }
    })
  })

  it('hides every drawing from assistive technology', () => {
    // The creature's state is carried by the accessible name on `CreatureSlot`.
    // The SVG itself is decoration and must not be read out twice.
    for (const family of GRAMMAR_FAMILIES) {
      const Species = CREATURE_COMPONENTS[family]
      const svg = render(<Species menace={3} />).container.querySelector('svg')

      expect(svg?.getAttribute('aria-hidden'), family).toBe('true')
    }
  })

  it('never hardcodes a colour', () => {
    // One class on the wrapper has to be able to restyle a whole creature, and
    // the night theme has to move it. Both need every colour to come from a
    // token or from `currentColor`.
    for (const family of GRAMMAR_FAMILIES) {
      const Species = CREATURE_COMPONENTS[family]
      const html = render(
        <Species menace={5} />
      ).container.innerHTML.toLowerCase()

      expect(html, family).not.toMatch(/#[0-9a-f]{3,8}\b/)
      expect(html, family).not.toMatch(/\brgba?\(/)
    }
  })

  it('covers every complexity level through the tier range', () => {
    // Sanity check that the tier type and the taxonomy's own scale line up.
    expect(TIERS.length).toBe(GRAMMAR_COMPLEXITY_LEVELS.length)
  })
})
