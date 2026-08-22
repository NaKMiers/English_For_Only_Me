import { describe, expect, it } from 'vitest'

import type { GrammarDrillRecord } from '@/modules/grammar/types'

import { selectDrillForStage } from './selectDrillForStage'

function drills(count: number): GrammarDrillRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    acceptedAnswers: ['a', 'b', 'c'],
    choices: null,
    difficulty: ((index % 3) + 1) as 1 | 2 | 3,
    explanation: 'why',
    id: `d${index + 1}`,
    kind: 'transform' as const,
    prompt: `prompt ${index + 1}`,
    target: `target ${index + 1}`,
  }))
}

describe('selectDrillForStage', () => {
  it('returns null when a point has no drills', () => {
    expect(
      selectDrillForStage({ drills: [], pointSlug: 'zero-article', stage: 1 })
    ).toBeNull()
  })

  it('is deterministic for the same point and stage', () => {
    const pool = drills(8)
    const first = selectDrillForStage({
      drills: pool,
      pointSlug: 'zero-article',
      stage: 3,
    })
    const second = selectDrillForStage({
      drills: pool,
      pointSlug: 'zero-article',
      stage: 3,
    })

    expect(first?.id).toBe(second?.id)
  })

  // The answer route re-resolves the drill server-side from (slug, drillId), so
  // determinism is a correctness property, not just a nicety.
  it('does not depend on the input array order', () => {
    const pool = drills(8)
    const reversed = [...pool].reverse()

    expect(
      selectDrillForStage({ drills: pool, pointSlug: 'some-point', stage: 2 })
        ?.id
    ).toBe(
      selectDrillForStage({
        drills: reversed,
        pointSlug: 'some-point',
        stage: 2,
      })?.id
    )
  })

  it('never repeats a drill across the 7 ladder stages when 8 exist', () => {
    const pool = drills(8)
    const served = new Set<string>()

    for (const stage of [1, 2, 3, 4, 5, 6, 7]) {
      const drill = selectDrillForStage({
        drills: pool,
        pointSlug: 'present-perfect-simple',
        stage,
      })

      expect(drill).not.toBeNull()
      served.add(drill?.id ?? '')
    }

    expect(served.size).toBe(7)
  })

  it('never repeats across 7 stages for a high-risk point with 12 drills', () => {
    const pool = drills(12)
    const served = new Set<string>()

    for (const stage of [1, 2, 3, 4, 5, 6, 7])
      served.add(
        selectDrillForStage({
          drills: pool,
          pointSlug: 'definite-article-the',
          stage,
        })?.id ?? ''
      )

    expect(served.size).toBe(7)
  })

  it('gives different points different drill positions', () => {
    const pool = drills(8)
    const first = selectDrillForStage({
      drills: pool,
      pointSlug: 'zero-article',
      stage: 1,
    })
    const second = selectDrillForStage({
      drills: pool,
      pointSlug: 'plural-regular',
      stage: 1,
    })

    // Not guaranteed different for every pair, but these two must not collide
    // or the offset is doing nothing.
    expect(first?.id).not.toBe(second?.id)
  })

  it('handles a stage below 1 without going out of bounds', () => {
    expect(
      selectDrillForStage({ drills: drills(8), pointSlug: 'x', stage: 0 })
    ).not.toBeNull()
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * The on-demand test appends AI-authored drills to the same array this reads.
   * If they were served here, unreviewed machine output would enter the
   * learner's daily review the moment they took a test - and recall is the
   * worst possible surface for a bad drill, because it repeats for weeks before
   * anyone notices. `constants.ts` records what happened the last time
   * generated content was trusted by default: "Please close door." shipped as an
   * accepted answer on a drill teaching the definite article.
   *
   * Promotion into recall goes through `grammar:export` and a human.
   */
  describe('generated drills (regression guard)', () => {
    function generated(count: number): GrammarDrillRecord[] {
      return drills(count).map(drill => ({
        ...drill,
        generated: true,
        id: `gen-${drill.id}`,
      }))
    }

    it('never serves a generated drill', () => {
      const pool = [...drills(8), ...generated(8)]

      for (let stage = 1; stage <= 7; stage += 1) {
        const picked = selectDrillForStage({
          drills: pool,
          pointSlug: 'present-perfect',
          stage,
        })

        expect(picked?.generated).toBeUndefined()
      }
    })

    it('returns null when every drill on the point is generated', () => {
      expect(
        selectDrillForStage({
          drills: generated(12),
          pointSlug: 'present-perfect',
          stage: 1,
        })
      ).toBeNull()
    })

    it('picks the same drill whether or not generated drills are present', () => {
      const reviewed = drills(8)

      for (let stage = 1; stage <= 7; stage += 1)
        expect(
          selectDrillForStage({
            drills: [...reviewed, ...generated(5)],
            pointSlug: 'articles',
            stage,
          })?.id
        ).toBe(
          selectDrillForStage({
            drills: reviewed,
            pointSlug: 'articles',
            stage,
          })?.id
        )
    })

    it('treats generated: false as reviewed', () => {
      const pool = drills(3).map(drill => ({ ...drill, generated: false }))

      expect(
        selectDrillForStage({ drills: pool, pointSlug: 'x', stage: 1 })
      ).not.toBeNull()
    })
  })
})
