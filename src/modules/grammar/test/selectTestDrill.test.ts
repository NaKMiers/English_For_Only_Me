import { describe, expect, it } from 'vitest'

import { selectDrillForStage } from '@/modules/grammar/recall/selectDrillForStage'
import { loadGrammarContent } from '@/modules/grammar/seed/loadGrammarContent'
import type { GrammarDrillRecord } from '@/modules/grammar/types'

import { selectTestDrill } from './selectTestDrill'

function drills(count: number): GrammarDrillRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    acceptedAnswers: ['a'],
    choices: null,
    difficulty: ((index % 3) + 1) as 1 | 2 | 3,
    explanation: 'why',
    id: `d${index + 1}`,
    kind: 'transform' as const,
    prompt: `prompt ${index + 1}`,
    target: `target ${index + 1}`,
  }))
}

describe('selectTestDrill', () => {
  it('never serves the recall drill for any committed point or stage', () => {
    let compared = 0

    for (const point of loadGrammarContent()) {
      const pool = point.drills as GrammarDrillRecord[]
      const reviewed = pool.filter(drill => !drill.generated)

      for (let stage = 1; stage <= 7; stage += 1) {
        const recall = selectDrillForStage({
          drills: pool,
          pointSlug: point.slug,
          stage,
        })
        const test = selectTestDrill({
          drills: pool,
          pointSlug: point.slug,
          stage,
        })

        if (reviewed.length < 2) {
          expect(test).toBeNull()
          continue
        }

        expect(test).not.toBeNull()
        expect(test?.generated).toBeFalsy()
        expect(test?.id).not.toBe(recall?.id)
        compared += 1
      }
    }

    expect(compared).toBeGreaterThan(0)
  })

  it('skips a point whose only reviewed drill is the recall drill', () => {
    const [only] = drills(1)

    expect(
      selectTestDrill({
        drills: [only, { ...only, generated: true, id: 'gen-1' }],
        pointSlug: 'zero-article',
        stage: 1,
      })
    ).toBeNull()
  })

  it('is deterministic for the same point and stage', () => {
    const pool = drills(8)
    const first = selectTestDrill({ drills: pool, pointSlug: 'a', stage: 3 })
    const second = selectTestDrill({ drills: pool, pointSlug: 'a', stage: 3 })

    expect(first?.id).toBe(second?.id)
  })
})
