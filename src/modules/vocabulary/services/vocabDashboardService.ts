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
 * server round trip. `actorId` is the read-only practice actor: null for a
 * first-time visitor, who gets defaults (no guest cookie is minted on a GET of
 * a page) and the unfiltered Explore deck, since nothing is classified yet.
 */
export async function getVocabularyDashboardData({
  actorId,
  now = new Date(),
}: {
  actorId: string | null
  now?: Date
}): Promise<VocabularyDashboardInitialData> {
  if (!actorId) {
    const [stats, exploreEntries] = await Promise.all([
      getVocabStatsForUser({ now, userId: '' }),
      listExploreVocabEntriesForUser({
        limit: VOCAB_EXPLORE_INITIAL_LIMIT,
        userId: null,
      }),
    ])

    return {
      due: { nextCursor: null, tasks: [] },
      exploreEntries,
      stats,
    }
  }

  const [stats, due, exploreEntries] = await Promise.all([
    getVocabStatsForUser({ now, userId: actorId }),
    listDueVocabRecallTasksForUser({
      limit: VOCAB_RECALL_DEFAULT_LIMIT,
      now,
      userId: actorId,
    }),
    listExploreVocabEntriesForUser({
      limit: VOCAB_EXPLORE_INITIAL_LIMIT,
      userId: actorId,
    }),
  ])

  return { due, exploreEntries, stats }
}
