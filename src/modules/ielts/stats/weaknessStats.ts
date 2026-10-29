import 'server-only'

import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'

import {
  type IeltsWeaknessAggregate,
  type IeltsWeaknessStats,
  shapeWeaknessStats,
} from './shapeWeakness'

export type { IeltsWeaknessRow, IeltsWeaknessStats } from './shapeWeakness'

/**
 * Accuracy per (skill, question type) over the owner's scored Listening and
 * Reading attempts. Computed at read time; nothing derived is stored.
 */
export async function readWeaknessStats(
  ownerId: string
): Promise<IeltsWeaknessStats> {
  const aggregates = await IeltsAttemptModel.aggregate<IeltsWeaknessAggregate>([
    {
      $match: {
        ownerId,
        status: 'scored',
        skill: { $in: ['listening', 'reading'] },
      },
    },
    { $sort: { startedAt: -1 } },
    { $limit: 200 },
    { $unwind: '$result.perQuestion' },
    {
      $group: {
        _id: { skill: '$skill', type: '$result.perQuestion.type' },
        correct: {
          $sum: {
            $cond: [{ $eq: ['$result.perQuestion.outcome', 'correct'] }, 1, 0],
          },
        },
        total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        skill: '$_id.skill',
        type: '$_id.type',
        correct: 1,
        total: 1,
      },
    },
  ])

  return shapeWeaknessStats(aggregates)
}
