import { describe, expect, it } from 'vitest'

import type { GrammarStatsRecord } from '@/modules/grammar/types'

import {
  isCursedCorner,
  resolveDungeonCell,
  type DungeonCellKind,
} from './resolveDungeonCell'

type ProgressCell = GrammarStatsRecord['progressCells'][number]

function cell(overrides: Partial<ProgressCell> = {}): ProgressCell {
  return {
    averageStage: null,
    cefrLevel: 'B1',
    complexity: 3,
    dangerous: 0,
    mastered: 0,
    total: 8,
    touched: 0,
    unverified: 0,
    ...overrides,
  }
}

describe('resolveDungeonCell', () => {
  describe('kind', () => {
    it('is empty when the pairing holds no rules', () => {
      expect(resolveDungeonCell(cell({ total: 0 })).kind).toBe('empty')
    })

    it('is fogged when nothing in it has been touched', () => {
      expect(resolveDungeonCell(cell({ touched: 0 })).kind).toBe('fogged')
    })

    it('is cleared when everything in it is mastered', () => {
      expect(
        resolveDungeonCell(
          cell({ averageStage: 7, mastered: 8, total: 8, touched: 8 })
        ).kind
      ).toBe('cleared')
    })

    it('grades competence, not completion', () => {
      // A fully started cell can still be weak if those points keep resetting,
      // which a completion percentage would hide entirely.
      const started = { touched: 8 }

      expect(
        resolveDungeonCell(cell({ ...started, averageStage: 1.2 })).kind
      ).toBe('weak')
      expect(
        resolveDungeonCell(cell({ ...started, averageStage: 2.5 })).kind
      ).toBe('shaky')
      expect(
        resolveDungeonCell(cell({ ...started, averageStage: 4 })).kind
      ).toBe('solid')
      expect(
        resolveDungeonCell(cell({ ...started, averageStage: 6 })).kind
      ).toBe('strong')
    })
  })

  /**
   * The accessibility defect this rewrite exists to fix. The old map carried its
   * entire meaning in the cell fill, so it was unreadable in greyscale and to a
   * colour-blind reader.
   */
  describe('readable without colour', () => {
    it('gives every kind a distinct fill level, apart from the two special cases', () => {
      const kinds: DungeonCellKind[] = [
        'empty',
        'fogged',
        'weak',
        'shaky',
        'solid',
        'strong',
        'cleared',
      ]
      const source: Record<DungeonCellKind, ProgressCell> = {
        cleared: cell({ mastered: 8, touched: 8 }),
        empty: cell({ total: 0 }),
        fogged: cell({ touched: 0 }),
        shaky: cell({ averageStage: 2.5, touched: 8 }),
        solid: cell({ averageStage: 4, touched: 8 }),
        strong: cell({ averageStage: 6, touched: 8 }),
        weak: cell({ averageStage: 1, touched: 8 }),
      }

      // The four competence levels must be four different fills, or the dial is
      // not carrying the state.
      expect(
        new Set(
          (['weak', 'shaky', 'solid', 'strong'] as const).map(
            kind => resolveDungeonCell(source[kind]).fill
          )
        ).size
      ).toBe(4)

      // `empty`, `fogged` and `cleared` are not points on that scale - they are
      // drawn as nothing, a dashed ring and a cross - so they are allowed to
      // share a fill number with a competence level.
      for (const kind of kinds)
        expect(resolveDungeonCell(source[kind]).kind, kind).toBe(kind)
    })

    it('states everything in the label that the drawing shows', () => {
      const resolved = resolveDungeonCell(
        cell({
          averageStage: 2,
          cefrLevel: 'A1',
          complexity: 5,
          dangerous: 3,
          mastered: 1,
          total: 6,
          touched: 4,
          unverified: 6,
        })
      )

      expect(resolved.label).toContain('A1')
      expect(resolved.label).toContain('difficulty 5')
      expect(resolved.label).toContain('6 rules')
      expect(resolved.label).toContain('4 started')
      expect(resolved.label).toContain('1 mastered')
      expect(resolved.label).toContain('average stage 2 of 7')
      expect(resolved.label).toContain('3 high interference')
      expect(resolved.label).toContain('none verified')
      expect(resolved.label).toContain('cursed corner')
    })

    it('says an empty cell is empty rather than reporting zeroes', () => {
      expect(resolveDungeonCell(cell({ total: 0 })).label).toContain(
        'no rules at this pairing'
      )
    })
  })

  describe('ghost state', () => {
    it('flags a cell where nothing has been verified', () => {
      // The launch state for all 30 cells.
      expect(
        resolveDungeonCell(cell({ total: 8, unverified: 8 })).allGhosts
      ).toBe(true)
    })

    it('does not flag a partly verified cell as all ghosts', () => {
      const resolved = resolveDungeonCell(cell({ total: 8, unverified: 3 }))

      expect(resolved.allGhosts).toBe(false)
      expect(resolved.label).toContain('3 unverified')
    })

    it('says nothing about verification when everything is verified', () => {
      const resolved = resolveDungeonCell(cell({ total: 8, unverified: 0 }))

      expect(resolved.allGhosts).toBe(false)
      expect(resolved.label).not.toContain('unverified')
    })

    it('flags a mastered cell built on unread lessons', () => {
      // The hollow win, at cell scale.
      expect(
        resolveDungeonCell(
          cell({ mastered: 8, total: 8, touched: 8, unverified: 8 })
        )
      ).toMatchObject({ allGhosts: true, kind: 'cleared' })
    })
  })

  describe('danger', () => {
    it('flags a cell holding any high-interference rule', () => {
      expect(resolveDungeonCell(cell({ dangerous: 1 })).isDangerous).toBe(true)
      expect(resolveDungeonCell(cell({ dangerous: 0 })).isDangerous).toBe(false)
    })
  })
})

describe('isCursedCorner', () => {
  it('is A1 at maximum difficulty and nothing else', () => {
    expect(isCursedCorner({ cefrLevel: 'A1', complexity: 5 })).toBe(true)
    expect(isCursedCorner({ cefrLevel: 'A1', complexity: 4 })).toBe(false)
    expect(isCursedCorner({ cefrLevel: 'A2', complexity: 5 })).toBe(false)
    expect(isCursedCorner({ cefrLevel: 'C1', complexity: 5 })).toBe(false)
  })
})
