import 'server-only'

import { randomUUID } from 'crypto'

import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import type { GrammarDrillRecord } from '@/modules/grammar/types'

import {
  toServedRecallTask,
  type GrammarServedRecallTask,
} from './recallTaskGrading'
import { selectDrillForStage } from './selectDrillForStage'

/**
 * Build today's recall queue.
 *
 * TWO queries, regardless of how many points are due. This is not an
 * optimisation, it is a decision already settled for the vocabulary module on
 * 2026-07-12 ("load due items and entries once ... to avoid N+1 query
 * patterns"). The obvious implementation - fetch due items, then loop fetching
 * each point's drills - costs one query per due point, so the screen the
 * learner opens every morning would get slower exactly as their due list grows.
 *
 *   1. due UserGrammarItem rows for this actor
 *   2. one find({ slug: { $in: dueSlugs } }) for the points
 *
 * The `idempotencyKey` for each served drill is minted here, in the same pass,
 * so the client has it to echo back on submit.
 *
 * Each task also carries its grading fields and the learner's counters, so the
 * browser can grade and predict the ladder move instantly (see
 * `recallTaskGrading.ts`). The server still re-grades on submit and wins.
 */
export async function getGrammarDueQueue({
  actorId,
  limit,
  now = new Date(),
}: {
  actorId: string
  limit: number
  now?: Date
}): Promise<GrammarServedRecallTask[]> {
  if (!actorId) return []

  const dueItems = await UserGrammarItemModel.find({
    actorId,
    dueAt: { $lte: now, $ne: null },
    status: 'learning',
  })
    .sort({ dueAt: 1 })
    .limit(limit)
    .lean()

  if (dueItems.length === 0) return []

  const points = await GrammarPointModel.find({
    slug: { $in: dueItems.map(item => item.pointSlug) },
  })
    .select(
      'slug title cefrLevel complexity family l1Risk l1RiskObserved reviewStatus drills mergedInto'
    )
    .lean()
  const pointBySlug = new Map(points.map(point => [point.slug, point]))

  return dueItems.flatMap(item => {
    const point = pointBySlug.get(item.pointSlug)

    // A point with no body yet, or a stub left by a merge, has nothing to drill.
    if (!point || point.mergedInto) return []

    const drill = selectDrillForStage({
      drills: point.drills as GrammarDrillRecord[],
      pointSlug: point.slug,
      stage: item.recallStage,
    })

    if (!drill) return []

    return [
      toServedRecallTask({
        drill,
        idempotencyKey: randomUUID(),
        item,
        point,
      }),
    ]
  })
}

export async function countGrammarDue({
  actorId,
  now = new Date(),
}: {
  actorId: string
  now?: Date
}) {
  if (!actorId) return 0

  return UserGrammarItemModel.countDocuments({
    actorId,
    dueAt: { $lte: now, $ne: null },
    status: 'learning',
  })
}
