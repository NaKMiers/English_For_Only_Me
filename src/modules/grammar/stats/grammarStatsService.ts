import 'server-only'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import { GRAMMAR_STATS_TREND_DAYS } from '@/modules/grammar/constants'
import { getCachedGrammarTaxonomy } from '@/modules/grammar/services/grammarContentCache'
import { effectiveL1Risk } from '@/modules/grammar/taxonomy/effectiveL1Risk'
import type { GrammarStatsRecord } from '@/modules/grammar/types'

import { buildProgressCells, computeStreakDays } from './grammarStats'

const DAY_MS = 86_400_000

/**
 * Everything the grammar dashboard needs, in a bounded number of queries.
 *
 * Deliberately does NOT loop per point. The taxonomy is 184 rows and the
 * learner's item set is at most that, so both are single finds. Attempt history
 * is capped to the trend window rather than read wholesale.
 */
export async function getGrammarStatsForActor({
  actorId,
  now = new Date(),
}: {
  actorId: string
  now?: Date
}): Promise<GrammarStatsRecord> {
  const since = new Date(now.getTime() - GRAMMAR_STATS_TREND_DAYS * DAY_MS)
  const startOfToday = new Date(now)

  startOfToday.setUTCHours(0, 0, 0, 0)

  const [{ points }, items, attempts] = await Promise.all([
    // Shared content, cached: `reviewStatus`, `family` and both risk fields
    // are there for the map - a cell has to know whether the lesson behind it
    // has been read by a human and how hard the learner judged it.
    getCachedGrammarTaxonomy(),
    actorId
      ? UserGrammarItemModel.find({ actorId })
          // recallStage is REQUIRED here: the heat map's competence signal is
          // the mean ladder stage per cell, and omitting it from the projection
          // silently rendered every cell's averageStage as null.
          .select('pointSlug status dueAt recallStage')
          .lean()
      : [],
    actorId
      ? GrammarDrillAttemptModel.find({ actorId, at: { $gte: since } })
          .select('at')
          .lean()
      : [],
  ])

  const touchedSlugs = new Set(items.map(item => item.pointSlug))
  const masteredSlugs = new Set(
    items.filter(item => item.status === 'mastered').map(item => item.pointSlug)
  )
  const stageBySlug = new Map(
    items.map(item => [item.pointSlug, item.recallStage])
  )

  return {
    dueCount: items.filter(
      item =>
        item.status === 'learning' &&
        item.dueAt &&
        item.dueAt.getTime() <= now.getTime()
    ).length,
    learningCount: items.filter(item => item.status === 'learning').length,
    masteredCount: masteredSlugs.size,
    progressCells: buildProgressCells({
      masteredSlugs,
      points: points.map(point => ({
        cefrLevel: point.cefrLevel,
        complexity: point.complexity,
        isDangerous: effectiveL1Risk(point) === 'high',
        isUnverified: point.reviewStatus !== 'reviewed',
        slug: point.slug,
      })),
      stageBySlug,
      touchedSlugs,
    }),
    reviewedTodayCount: attempts.filter(
      attempt => attempt.at.getTime() >= startOfToday.getTime()
    ).length,
    streakDays: computeStreakDays({
      answeredAt: attempts.map(attempt => attempt.at),
      now,
    }),
    totalPoints: points.length,
    untouchedCount: points.filter(point => !touchedSlugs.has(point.slug))
      .length,
  }
}
