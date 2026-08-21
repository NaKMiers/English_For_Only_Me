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

describe('dungeon map cell markings', () => {
  function cellAt(
    cells: ReturnType<typeof buildProgressCells>,
    cefrLevel: string,
    complexity: number
  ) {
    return cells.find(
      cell => cell.cefrLevel === cefrLevel && cell.complexity === complexity
    )
  }

  it('counts the dangerous points in a cell', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points: [
        { cefrLevel: 'A1', complexity: 5, isDangerous: true, slug: 'a' },
        { cefrLevel: 'A1', complexity: 5, isDangerous: true, slug: 'b' },
        { cefrLevel: 'A1', complexity: 5, isDangerous: false, slug: 'c' },
      ],
      touchedSlugs: new Set(),
    })

    expect(cellAt(cells, 'A1', 5)).toMatchObject({ dangerous: 2, total: 3 })
  })

  it('counts the unverified points in a cell', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points: [
        { cefrLevel: 'B1', complexity: 3, isUnverified: true, slug: 'a' },
        { cefrLevel: 'B1', complexity: 3, isUnverified: false, slug: 'b' },
      ],
      touchedSlugs: new Set(),
    })

    expect(cellAt(cells, 'B1', 3)).toMatchObject({ total: 2, unverified: 1 })
  })

  /**
   * The launch state, and the reason the ghost marking exists: every one of the
   * 184 lessons is unverified, so a fully-mastered cell is still built entirely
   * on content nobody has checked. The map must be able to say so.
   */
  it('marks a fully mastered cell as fully unverified when it is', () => {
    const cells = buildProgressCells({
      masteredSlugs: new Set(['a', 'b']),
      points: [
        { cefrLevel: 'A2', complexity: 2, isUnverified: true, slug: 'a' },
        { cefrLevel: 'A2', complexity: 2, isUnverified: true, slug: 'b' },
      ],
      touchedSlugs: new Set(['a', 'b']),
    })

    expect(cellAt(cells, 'A2', 2)).toMatchObject({
      mastered: 2,
      total: 2,
      unverified: 2,
    })
  })

  it('reports zero for both when the flags are absent', () => {
    // The flags are optional on the input, so an older caller keeps working.
    const cells = buildProgressCells({
      masteredSlugs: new Set(),
      points: [{ cefrLevel: 'C1', complexity: 1, slug: 'a' }],
      touchedSlugs: new Set(),
    })

    expect(cellAt(cells, 'C1', 1)).toMatchObject({
      dangerous: 0,
      unverified: 0,
    })
  })

  it('still returns a cell for every level and difficulty pair', () => {
    // 6 CEFR levels x 5 difficulties. The grid is fixed; only the counts vary.
    expect(
      buildProgressCells({
        masteredSlugs: new Set(),
        points: [],
        touchedSlugs: new Set(),
      })
    ).toHaveLength(30)
  })
})
