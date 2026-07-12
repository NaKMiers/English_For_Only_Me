import 'server-only'

import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VOCAB_STATS_TREND_DAYS } from '@/modules/vocabulary/constants'
import { toUserVocabItemRecord } from '@/modules/vocabulary/services/userVocabItemRecords'

import { aggregateVocabStats } from './vocabStats'

export async function getVocabStatsForUser({
  now = new Date(),
  userId,
}: {
  now?: Date
  userId: string
}) {
  const items = await UserVocabItemModel.find({ userId }).lean()

  return aggregateVocabStats({
    items: items.map(toUserVocabItemRecord),
    now,
    trendDays: VOCAB_STATS_TREND_DAYS,
  })
}
