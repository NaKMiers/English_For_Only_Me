import { describe, expect, it } from 'vitest'

import type { GrammarDrillRecord } from '@/modules/grammar/types'

import {
  selectDiagnosticItems,
  type DiagnosticCandidate,
} from './selectDiagnosticItems'

function drill(
  id: string,
  difficulty: 1 | 2 | 3,
  overrides: Partial<GrammarDrillRecord> = {}
): GrammarDrillRecord {
  return {
    acceptedAnswers: ['a', 'b', 'c'],
    choices: null,
    difficulty,
    explanation: 'why',
    id,
    kind: 'transform',
    prompt: `prompt ${id}`,
    target: 'target',
    ...overrides,
  }
}

function candidate(
  overrides: Partial<DiagnosticCandidate> = {}
): DiagnosticCandidate {
  return {
    cefrLevel: 'B1',
    complexity: 3,
    drills: [drill('d1', 1), drill('d2', 3)],
    family: 'verb-tenses',
    l1Risk: 'medium',
    slug: 'some-point',
    title: 'Some Point',
    ...overrides,
  }
}

function pool(
  count: number,
  overrides: (index: number) => Partial<DiagnosticCandidate>
) {
  return Array.from({ length: count }, (_, index) =>
    candidate({
      slug: `point-${index}`,
      title: `Point ${index}`,
      ...overrides(index),
    })
  )
}

describe('selectDiagnosticItems', () => {
  it('returns nothing when there are no candidates or the limit is zero', () => {
    expect(selectDiagnosticItems({ candidates: [], limit: 10 })).toEqual([])
    expect(
      selectDiagnosticItems({ candidates: [candidate()], limit: 0 })
    ).toEqual([])
  })

  // The module ships with most of the curriculum unwritten, so the diagnostic
  // must degrade honestly rather than serving empty prompts.
  it('ignores points that have no drills', () => {
    const items = selectDiagnosticItems({
      candidates: [
        candidate({ drills: [], slug: 'no-drills' }),
        candidate({ slug: 'has-drills' }),
      ],
      limit: 10,
    })

    expect(items).toHaveLength(1)
    expect(items[0].pointSlug).toBe('has-drills')
  })

  it('skips points the learner has already started', () => {
    const items = selectDiagnosticItems({
      candidates: [
        candidate({ slug: 'started' }),
        candidate({ slug: 'fresh' }),
      ],
      limit: 10,
      skipSlugs: new Set(['started']),
    })

    expect(items.map(item => item.pointSlug)).toEqual(['fresh'])
  })

  it('never returns more than the limit', () => {
    const items = selectDiagnosticItems({
      candidates: pool(50, () => ({})),
      limit: 12,
    })

    expect(items).toHaveLength(12)
  })

  it('picks the hardest drill on each point, because it discriminates best', () => {
    const items = selectDiagnosticItems({
      candidates: [
        candidate({
          drills: [drill('easy', 1), drill('hard', 3), drill('mid', 2)],
        }),
      ],
      limit: 5,
    })

    expect(items[0].drillId).toBe('hard')
  })

  // The whole point of the weighting: spend questions where the answer is
  // genuinely uncertain for a Vietnamese speaker.
  it('weights selection toward high L1 risk', () => {
    const candidates = [
      ...pool(20, index => ({
        family: 'articles-determiners',
        l1Risk: 'high' as const,
        slug: `high-${index}`,
      })),
      ...pool(20, index => ({
        family: 'comparatives',
        l1Risk: 'low' as const,
        slug: `low-${index}`,
      })),
      ...pool(20, index => ({
        family: 'modals',
        l1Risk: 'medium' as const,
        slug: `medium-${index}`,
      })),
    ]
    const items = selectDiagnosticItems({ candidates, limit: 20 })
    const highCount = items.filter(item => item.l1Risk === 'high').length
    const lowCount = items.filter(item => item.l1Risk === 'low').length

    expect(highCount).toBeGreaterThan(lowCount)
    expect(highCount).toBeGreaterThanOrEqual(8)
  })

  it('spreads consecutive items across families rather than clustering', () => {
    const candidates = [
      ...pool(5, index => ({
        family: 'verb-tenses',
        l1Risk: 'high' as const,
        slug: `tense-${index}`,
      })),
      ...pool(5, index => ({
        family: 'passive',
        l1Risk: 'high' as const,
        slug: `passive-${index}`,
      })),
      ...pool(5, index => ({
        family: 'prepositions',
        l1Risk: 'high' as const,
        slug: `prep-${index}`,
      })),
    ]
    const items = selectDiagnosticItems({ candidates, limit: 6 })
    const firstThree = new Set(
      items.slice(0, 3).map(item => item.pointSlug.split('-')[0])
    )

    // Three different families in the first three questions.
    expect(firstThree.size).toBe(3)
  })

  it('backfills from other risk buckets when one cannot meet its quota', () => {
    // Only low-risk points exist, so a 10-item test must still return 10.
    const items = selectDiagnosticItems({
      candidates: pool(15, index => ({
        l1Risk: 'low' as const,
        slug: `low-${index}`,
      })),
      limit: 10,
    })

    expect(items).toHaveLength(10)
  })

  it('is deterministic for the same input', () => {
    const candidates = pool(30, index => ({
      family: index % 2 === 0 ? 'modals' : 'passive',
      l1Risk: index % 3 === 0 ? ('high' as const) : ('medium' as const),
      slug: `p-${index}`,
    }))
    const first = selectDiagnosticItems({ candidates, limit: 10 })
    const second = selectDiagnosticItems({ candidates, limit: 10 })

    expect(first.map(item => item.drillId)).toEqual(
      second.map(item => item.drillId)
    )
    expect(first.map(item => item.pointSlug)).toEqual(
      second.map(item => item.pointSlug)
    )
  })

  it('carries choices through for multiple-choice items', () => {
    const items = selectDiagnosticItems({
      candidates: [
        candidate({
          drills: [drill('c1', 3, { choices: ['a', 'b'], kind: 'choice' })],
        }),
      ],
      limit: 1,
    })

    expect(items[0].kind).toBe('choice')
    expect(items[0].choices).toEqual(['a', 'b'])
  })

  it('never repeats a point', () => {
    const items = selectDiagnosticItems({
      candidates: pool(40, index => ({
        l1Risk: 'high' as const,
        slug: `p-${index}`,
      })),
      limit: 30,
    })
    const slugs = new Set(items.map(item => item.pointSlug))

    expect(slugs.size).toBe(items.length)
  })
})
