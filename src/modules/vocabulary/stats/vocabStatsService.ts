import 'server-only'

import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'
import { VOCAB_STATS_TREND_DAYS } from '@/modules/vocabulary/constants'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import {
  buildEmptyVocabStats,
  buildVocabAttemptFacetPipeline,
  buildVocabItemFacetPipeline,
  getVocabStatsWindow,
  toVocabStatsRecord,
  type VocabAttemptFacets,
  type VocabItemFacets,
} from './vocabStatsFacets'

const EMPTY_ITEM_FACETS: VocabItemFacets = {
  dueToday: [],
  growth: [],
  hardest: [],
  learnedToday: [],
  overdue: [],
  statusCounts: [],
}

const EMPTY_ATTEMPT_FACETS: VocabAttemptFacets = {
  reviewsToday: [],
  streakDays: [],
  summary: [],
}

/** Two round trips, one per collection - see vocabStatsFacets.ts. */
export async function getVocabStatsForUser({
  now = new Date(),
  userId,
}: {
  now?: Date
  userId: string
}): Promise<VocabStatsRecord> {
  if (!userId)
    return buildEmptyVocabStats({ now, trendDays: VOCAB_STATS_TREND_DAYS })

  const window = getVocabStatsWindow(now, VOCAB_STATS_TREND_DAYS)

  const [[items], [attempts]] = await Promise.all([
    UserVocabItemModel.aggregate<VocabItemFacets>(
      buildVocabItemFacetPipeline({
        userId,
        vocabEntryCollection: VocabEntryModel.collection.collectionName,
        window,
      })
    ),
    VocabRecallAttemptModel.aggregate<VocabAttemptFacets>(
      buildVocabAttemptFacetPipeline({ userId, window })
    ),
  ])

  return toVocabStatsRecord({
    attempts: attempts ?? EMPTY_ATTEMPT_FACETS,
    items: items ?? EMPTY_ITEM_FACETS,
    now,
    trendDays: VOCAB_STATS_TREND_DAYS,
  })
}
