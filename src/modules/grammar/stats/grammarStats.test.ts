import { describe, expect, it } from 'vitest'

import { buildProgressCells, computeStreakDays } from './grammarStats'

const NOW = new Date('2026-08-20T12:00:00.000Z')
const DAY_MS = 86_400_000

function daysAgo(count: number) {
  return new Date(NOW.getTime() - count * DAY_MS)
}

describe('computeStreakDays', () => {
  it('returns 0 with no history', () => {
    expect(computeStreakDays({ answeredAt: [], now: NOW })).toBe(0)
  })

  it('counts today alone as a streak of 1', () => {
    expect(computeStreakDays({ answeredAt: [NOW], now: NOW })).toBe(1)
  })

  it('counts consecutive days ending today', () => {
    expect(
      computeStreakDays({
        answeredAt: [daysAgo(0), daysAgo(1), daysAgo(2)],
        now: NOW,
      })
    ).toBe(3)
  })

  // Otherwise the streak looks broken every morning before you have studied.
  it('keeps a streak alive when the last answer was yesterday', () => {
    expect(
      computeStreakDays({ answeredAt: [daysAgo(1), daysAgo(2)], now: NOW })
    ).toBe(2)
  })

  it('breaks the streak after a two-day gap', () => {
    expect(
      computeStreakDays({ answeredAt: [daysAgo(2), daysAgo(3)], now: NOW })
    ).toBe(0)
  })

  it('stops counting at the first missing day', () => {
    expect(
      computeStreakDays({
        answeredAt: [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(4)],
        now: NOW,
      })
    ).toBe(2)
  })

  it('does not double count multiple answers on one day', () => {
    expect(
      computeStreakDays({
        answeredAt: [daysAgo(0), daysAgo(0), daysAgo(0)],
        now: NOW,
      })
    ).toBe(1)
  })
})

describe('buildProgressCells', () => {
  const points = [
    {
      cefrLevel: 'A1' as const,
      complexity: 5 as const,
      slug: 'definite-article-the',
    },
    { cefrLevel: 'A1' as const, complexity: 5 as const, slug: 'zero-article' },
    {
      cefrLevel: 'C1' as const,
      complexity: 3 as const,
      slug: 'future-perfect-continuous',
    },
  ]

  it('emits a complete 6x5 grid even where no points exist', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      touchedSlugs: new Set(),
    })

    expect(cells).toHaveLength(30)
  })

  it('counts totals per level and difficulty cell', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      touchedSlugs: new Set(),
    })
    const a1Hard = cells.find(
      cell => cell.cefrLevel === 'A1' && cell.complexity === 5
    )

    expect(a1Hard?.total).toBe(2)
  })

  // The whole reason for two axes: beginner-level but brutally hard points must
  // land in their own cell rather than being averaged into "A1 is easy".
  it('places A1 high-difficulty points in the top-left region', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(['zero-article']),
      points,
      touchedSlugs: new Set(['zero-article', 'definite-article-the']),
    })
    const cell = cells.find(
      candidate => candidate.cefrLevel === 'A1' && candidate.complexity === 5
    )

    expect(cell).toMatchObject({ mastered: 1, total: 2, touched: 2 })
  })

  it('leaves empty cells at zero', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      touchedSlugs: new Set(),
    })
    const empty = cells.find(
      cell => cell.cefrLevel === 'B2' && cell.complexity === 1
    )

    expect(empty).toMatchObject({ mastered: 0, total: 0, touched: 0 })
  })

  // Average ladder stage is what turns the completion grid into a competence
  // grid: a fully-started cell can still be weak.
  it('averages the ladder stage across touched points in a cell', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      stageBySlug: new Map([
        ['definite-article-the', 2],
        ['zero-article', 5],
      ]),
      touchedSlugs: new Set(['definite-article-the', 'zero-article']),
    })
    const cell = cells.find(
      candidate => candidate.cefrLevel === 'A1' && candidate.complexity === 5
    )

    expect(cell?.averageStage).toBe(3.5)
  })

  it('reports a null average where nothing is touched', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      touchedSlugs: new Set(),
    })

    for (const cell of cells) expect(cell.averageStage).toBeNull()
  })

  it('rounds the average to one decimal place', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      stageBySlug: new Map([
        ['definite-article-the', 1],
        ['zero-article', 2],
      ]),
      touchedSlugs: new Set(['definite-article-the', 'zero-article']),
    })
    const cell = cells.find(
      candidate => candidate.cefrLevel === 'A1' && candidate.complexity === 5
    )

    expect(cell?.averageStage).toBe(1.5)
  })

  it('distinguishes a fully-started weak cell from a strong one', () => {
    const weak = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      stageBySlug: new Map([
        ['definite-article-the', 1],
        ['zero-article', 1],
      ]),
      touchedSlugs: new Set(['definite-article-the', 'zero-article']),
    }).find(cell => cell.cefrLevel === 'A1' && cell.complexity === 5)
    const strong = buildProgressCells({
      masteredSlugs: new Set(),
      points,
      stageBySlug: new Map([
        ['definite-article-the', 6],
        ['zero-article', 6],
      ]),
      touchedSlugs: new Set(['definite-article-the', 'zero-article']),
    }).find(cell => cell.cefrLevel === 'A1' && cell.complexity === 5)

    // Same touched count and same mastered count; only competence differs.
    expect(weak?.touched).toBe(strong?.touched)
    expect(weak?.mastered).toBe(strong?.mastered)
    expect(weak?.averageStage).toBeLessThan(strong?.averageStage ?? 0)
  })

  it('ignores a point whose level or difficulty is out of range', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points: [
        ...points,
        { cefrLevel: 'D9' as 'A1', complexity: 9 as 1, slug: 'nonsense' },
      ],
      touchedSlugs: new Set(),
    })

    expect(cells.reduce((sum, cell) => sum + cell.total, 0)).toBe(points.length)
  })
})
