import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
} from '@/modules/grammar/constants'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarStatsRecord,
} from '@/modules/grammar/types'

const DAY_MS = 86_400_000

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Consecutive days ending today (or yesterday) on which at least one drill was
 * answered.
 *
 * Yesterday counts as still-alive so the streak does not appear broken first
 * thing in the morning before the day's session. Pure, so it is testable
 * without a database.
 */
export function computeStreakDays({
  answeredAt,
  now = new Date(),
}: {
  answeredAt: Date[]
  now?: Date
}) {
  if (answeredAt.length === 0) return 0

  const days = new Set(answeredAt.map(toDayKey))
  const todayKey = toDayKey(now)
  const yesterdayKey = toDayKey(new Date(now.getTime() - DAY_MS))

  // A streak is only alive if it reaches today or yesterday.
  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0

  let streak = 0
  let cursor = days.has(todayKey)
    ? new Date(now)
    : new Date(now.getTime() - DAY_MS)

  while (days.has(toDayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }

  return streak
}

interface PointCell {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  /** Effective risk is high. Resolved by the caller via `effectiveL1Risk`. */
  isDangerous?: boolean
  /** No human has read this lesson. */
  isUnverified?: boolean
  slug: string
}

/**
 * Mean ladder stage across the touched points in a cell, or null when none are
 * touched.
 *
 * This is what turns the completion grid into a COMPETENCE grid. "3 of 8
 * mastered" says how far through you are; an average stage of 2.1 says the
 * points you have started here are still weak. A broad on-demand test can touch
 * a whole row of the grid in one sitting, so this becomes the primary signal and
 * mastered-count becomes the secondary one.
 */
function averageStage(stages: number[]) {
  if (stages.length === 0) return null

  return (
    Math.round(
      (stages.reduce((sum, stage) => sum + stage, 0) / stages.length) * 10
    ) / 10
  )
}

/**
 * Build the level-by-difficulty grid.
 *
 * This is the payoff of keeping CEFR level and difficulty as independent axes.
 * The bottom-left-to-top-right diagonal is conventional progression; the
 * interesting region is TOP-LEFT - low level, high difficulty - which is where
 * articles, plural -s, and present perfect sit. A single-axis progress bar
 * cannot show that region at all.
 *
 * Cells with no points are still emitted so the grid renders as a complete
 * rectangle rather than a ragged one.
 */
export function buildProgressCells({
  masteredSlugs,
  points,
  stageBySlug = new Map<string, number>(),
  touchedSlugs,
}: {
  masteredSlugs: Set<string>
  points: PointCell[]
  /** Current ladder stage per touched point, for the competence signal. */
  stageBySlug?: Map<string, number>
  touchedSlugs: Set<string>
}): GrammarStatsRecord['progressCells'] {
  const byCell = new Map<
    string,
    {
      dangerous: number
      mastered: number
      stages: number[]
      total: number
      touched: number
      unverified: number
    }
  >()

  for (const level of GRAMMAR_CEFR_LEVELS)
    for (const complexity of GRAMMAR_COMPLEXITY_LEVELS)
      byCell.set(`${level}:${complexity}`, {
        dangerous: 0,
        mastered: 0,
        stages: [],
        total: 0,
        touched: 0,
        unverified: 0,
      })

  for (const point of points) {
    const key = `${point.cefrLevel}:${point.complexity}`
    const cell = byCell.get(key)

    if (!cell) continue

    cell.total += 1
    if (touchedSlugs.has(point.slug)) cell.touched += 1
    if (masteredSlugs.has(point.slug)) cell.mastered += 1
    // Both read the EFFECTIVE risk and the review status, which the caller
    // resolves. Counted here rather than derived later so the map needs no
    // second pass over 184 points.
    if (point.isDangerous) cell.dangerous += 1
    if (point.isUnverified) cell.unverified += 1

    const stage = stageBySlug.get(point.slug)

    if (stage !== undefined) cell.stages.push(stage)
  }

  return [...byCell.entries()].map(([key, cell]) => {
    const [cefrLevel, complexity] = key.split(':')

    return {
      averageStage: averageStage(cell.stages),
      cefrLevel: cefrLevel as GrammarCefrLevel,
      complexity: Number(complexity) as GrammarComplexity,
      dangerous: cell.dangerous,
      mastered: cell.mastered,
      total: cell.total,
      touched: cell.touched,
      unverified: cell.unverified,
    }
  })
}
