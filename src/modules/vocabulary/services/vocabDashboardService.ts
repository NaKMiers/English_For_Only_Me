import 'server-only'

import {
  VOCAB_EXPLORE_INITIAL_LIMIT,
  VOCAB_RECALL_DEFAULT_LIMIT,
} from '@/modules/vocabulary/constants'
import { listExploreVocabEntriesForUser } from '@/modules/vocabulary/explore/exploreService'
import { listDueVocabRecallTasksForUser } from '@/modules/vocabulary/recall/recallTaskService'
import { getVocabStatsForUser } from '@/modules/vocabulary/stats/vocabStatsService'
import type { VocabularyDashboardInitialData } from '@/modules/vocabulary/types'

/**
 * Everything the vocabulary landing page shows on first paint, read in one
 * server round trip, for the signed-in learner.
 */
export async function getVocabularyDashboardData({
  now = new Date(),
  userId,
}: {
  now?: Date
  userId: string
}): Promise<VocabularyDashboardInitialData> {
  const [stats, due, exploreEntries] = await Promise.all([
    getVocabStatsForUser({ now, userId }),
    listDueVocabRecallTasksForUser({
      limit: VOCAB_RECALL_DEFAULT_LIMIT,
      now,
      userId,
    }),
    listExploreVocabEntriesForUser({
      limit: VOCAB_EXPLORE_INITIAL_LIMIT,
      userId,
    }),
  ])

  return { due, exploreEntries, stats }
}
