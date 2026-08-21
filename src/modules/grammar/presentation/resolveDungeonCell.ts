import type { GrammarStatsRecord } from '@/modules/grammar/types'

type ProgressCell = GrammarStatsRecord['progressCells'][number]

/**
 * What a map cell is. Ordered from unknown to conquered.
 *
 * A single scale, so the map can be read top to bottom rather than decoded.
 */
export type DungeonCellKind =
  'empty' | 'fogged' | 'weak' | 'shaky' | 'solid' | 'strong' | 'cleared'

export interface DungeonCell {
  /** True where every point in the cell is unverified: the whole cell is ghosts. */
  allGhosts: boolean
  /**
   * How many quarters of the state dial are filled, 0 to 4. This is the
   * colour-free carrier, DRAWN rather than written: the obvious approach is a
   * ramp of glyphs, and the half-filled circle characters turned out to be
   * indistinguishable from each other at the size a grid cell allows - so the
   * grid claimed to be readable in greyscale while not being.
   */
  fill: 0 | 1 | 2 | 3 | 4
  /** True where this cell holds at least one high-interference point. */
  isDangerous: boolean
  /** A1 x difficulty 5. The corner the whole two-axis taxonomy exists to expose. */
  isCursed: boolean
  kind: DungeonCellKind
  /** Full sentence, for the accessible description and the visible tooltip. */
  label: string
  /** Short text in the cell. Never the only carrier of meaning. */
  value: string
}

/**
 * Quarters filled per state, so the map is readable in greyscale, by a
 * colour-blind reader, and in both themes.
 *
 * The old progress map carried its entire meaning in the cell background, which
 * is one of the two accessibility defects this rewrite exists to fix. The other
 * was `title=`, unreachable by keyboard and by touch.
 */
const FILL: Record<DungeonCellKind, DungeonCell['fill']> = {
  cleared: 4,
  empty: 0,
  fogged: 0,
  shaky: 2,
  solid: 3,
  strong: 4,
  weak: 1,
}

/**
 * The cursed corner: beginner level, maximum difficulty.
 *
 * This is the whole argument for keeping level and difficulty as separate axes.
 * Articles, the zero article and countability live here - rules met in the first
 * month and still wrong years later. A curriculum sorted by level files them
 * under "beginner, done" and never raises them again.
 */
export function isCursedCorner(cell: {
  cefrLevel: string
  complexity: number
}) {
  return cell.cefrLevel === 'A1' && cell.complexity === 5
}

/**
 * Turn a progress cell into something drawable.
 *
 * Pure, and the only place the map's meaning is decided - the component just
 * draws what this returns.
 */
export function resolveDungeonCell(cell: ProgressCell): DungeonCell {
  const kind = resolveKind(cell)
  const isDangerous = cell.dangerous > 0
  const allGhosts = cell.total > 0 && cell.unverified === cell.total

  return {
    allGhosts,
    fill: FILL[kind],
    isCursed: isCursedCorner(cell),
    isDangerous,
    kind,
    label: describe({ allGhosts, cell, isDangerous, kind }),
    value:
      cell.total === 0
        ? ''
        : cell.averageStage === null
          ? `0/${cell.total}`
          : `${cell.averageStage}`,
  }
}

function resolveKind(cell: ProgressCell): DungeonCellKind {
  if (cell.total === 0) return 'empty'
  if (cell.mastered === cell.total) return 'cleared'
  if (cell.touched === 0) return 'fogged'

  // Competence, not completion: a cell full of stage-1 points is weak even
  // though it is entirely "started", and a stage-5 cell is strong with nothing
  // formally mastered.
  const { averageStage } = cell

  if (averageStage === null) return 'weak'
  if (averageStage >= 5) return 'strong'
  if (averageStage >= 3.5) return 'solid'
  if (averageStage >= 2) return 'shaky'

  return 'weak'
}

const KIND_PHRASE: Record<DungeonCellKind, string> = {
  cleared: 'all mastered',
  empty: 'no rules at this pairing',
  fogged: 'never entered',
  shaky: 'shaky',
  solid: 'solid',
  strong: 'strong',
  weak: 'weak',
}

function describe({
  allGhosts,
  cell,
  isDangerous,
  kind,
}: {
  allGhosts: boolean
  cell: ProgressCell
  isDangerous: boolean
  kind: DungeonCellKind
}) {
  if (kind === 'empty')
    return `${cell.cefrLevel}, difficulty ${cell.complexity}: no rules at this pairing.`

  const parts = [
    `${cell.total} ${cell.total === 1 ? 'rule' : 'rules'}`,
    `${cell.touched} started`,
    `${cell.mastered} mastered`,
  ]

  if (cell.averageStage !== null)
    parts.push(`average stage ${cell.averageStage} of 7`)

  if (isDangerous) parts.push(`${cell.dangerous} high interference`)

  if (allGhosts) parts.push('none verified by a human')
  else if (cell.unverified > 0) parts.push(`${cell.unverified} unverified`)

  if (isCursedCorner(cell)) parts.push('the cursed corner')

  return `${cell.cefrLevel}, difficulty ${cell.complexity}, ${KIND_PHRASE[kind]}: ${parts.join(', ')}.`
}
