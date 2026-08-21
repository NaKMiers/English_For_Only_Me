import { describe, expect, it } from 'vitest'

import type { GrammarContentFile } from '@/modules/grammar/types'

import { buildL1RiskQueue } from './buildL1RiskQueue'

function row(
  overrides: Partial<GrammarContentFile[number]> = {}
): GrammarContentFile[number] {
  return {
    cefrLevel: 'A1',
    complexity: 3,
    family: 'articles-determiners',
    l1Risk: 'medium',
    order: 1,
    slug: 'a-point',
    summary: 'A summary.',
    title: 'A Point',
    ...overrides,
  }
}

describe('buildL1RiskQueue', () => {
  it('puts the highest effective risk first', () => {
    const queue = buildL1RiskQueue([
      row({ l1Risk: 'low', slug: 'low-one' }),
      row({ l1Risk: 'high', slug: 'high-one' }),
      row({ l1Risk: 'medium', slug: 'medium-one' }),
    ])

    expect(queue.map(entry => entry.slug)).toEqual([
      'high-one',
      'medium-one',
      'low-one',
    ])
  })

  it('respects a judgment already recorded when ordering', () => {
    const queue = buildL1RiskQueue([
      row({ l1Risk: 'high', slug: 'authored-high' }),
      row({ l1Risk: 'low', l1RiskObserved: 'high', slug: 'judged-high' }),
      row({ l1Risk: 'medium', slug: 'authored-medium' }),
    ])

    // Both high-risk rows come before the medium one; the unjudged one first,
    // since that is the work left to do.
    expect(queue.map(entry => entry.slug)).toEqual([
      'authored-high',
      'judged-high',
      'authored-medium',
    ])
  })

  it('keeps judged rows in the queue so a judgment can be revisited', () => {
    const queue = buildL1RiskQueue([
      row({ l1RiskObserved: 'low', slug: 'already-judged' }),
    ])

    expect(queue).toHaveLength(1)
    expect(queue[0].l1RiskObserved).toBe('low')
  })

  it('drops merge stubs', () => {
    const queue = buildL1RiskQueue([
      row({ slug: 'survivor' }),
      row({ mergedInto: 'survivor', slug: 'retired' }),
    ])

    expect(queue.map(entry => entry.slug)).toEqual(['survivor'])
  })

  it('is deterministic, so reopening the tool resumes in the same place', () => {
    const points = [
      row({ complexity: 2, slug: 'b' }),
      row({ complexity: 2, slug: 'a' }),
      row({ complexity: 5, slug: 'c' }),
    ]

    expect(buildL1RiskQueue(points).map(entry => entry.slug)).toEqual(
      buildL1RiskQueue([...points].reverse()).map(entry => entry.slug)
    )
  })

  /**
   * The module's central guarantee, restated on a new surface. This queue is
   * built from the file where drills live, and the panel it feeds is a client
   * component - so anything it carries reaches the browser.
   */
  it('carries no drill data', () => {
    const queue = buildL1RiskQueue([
      row({
        drills: [
          {
            acceptedAnswers: ['the durian'],
            choices: null,
            difficulty: 1,
            explanation: 'why',
            id: 'd1',
            kind: 'fillBlank',
            prompt: 'I ate ___ durian.',
            target: 'the durian',
          },
        ],
      }),
    ])

    const serialised = JSON.stringify(queue)

    expect(serialised).not.toContain('acceptedAnswers')
    expect(serialised).not.toContain('the durian')
    expect(queue[0]).not.toHaveProperty('drills')
  })

  it('reports whether a lesson body exists', () => {
    const queue = buildL1RiskQueue([
      row({ explanation: 'Some explanation.', slug: 'written' }),
      row({ slug: 'unwritten' }),
    ])
    const bySlug = new Map(queue.map(entry => [entry.slug, entry]))

    expect(bySlug.get('written')?.hasLesson).toBe(true)
    expect(bySlug.get('unwritten')?.hasLesson).toBe(false)
  })
})
