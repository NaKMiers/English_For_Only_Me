import 'server-only'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getCachedVideoCount } from '@/modules/dictation/content/catalogReaders'
import { getCompletionCountsForUser } from '@/modules/dictation/content/progressRepository'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

import {
  ACTIVE_REVIEW_STATUSES,
  buildGlobalStatsPipeline,
  computeGlobalDictationStats,
  EMPTY_GLOBAL_STATS_SUMMARY,
  GLOBAL_STATS_TOKEN_PROJECTION,
  type GlobalStatsFacetResult,
  type GlobalStatsTokenAttemptDocument,
  RECENT_TOKEN_ATTEMPT_LIMIT,
  toGlobalStatsSummary,
  toGlobalStatsTokenAttempt,
} from './globalStats'

async function countCompletedVideos(
  completionCounts: Promise<Map<string, number>>
) {
  const completedIds = [...(await completionCounts).keys()]

  if (completedIds.length === 0) return 0

  // Only videos that still exist count, matching the old catalog filter.
  return DictationVideoModel.countDocuments({ _id: { $in: completedIds } })
}

/**
 * Null when the viewer has no practice identity yet: the catalog total still
 * loads (from the cache, so no connection is needed) and per-user rows are
 * skipped rather than queried with an empty/invalid owner.
 *
 * Pass `completionCounts` when the caller already loads them (the /dictation
 * page needs them for its cards) so the same aggregation is not run twice.
 *
 * Cost stays flat as history grows: counts, sums, streak days and first tries
 * are reduced inside MongoDB (one $facet pass), and only the newest
 * RECENT_TOKEN_ATTEMPT_LIMIT attempts' tokens are shipped, newest first via
 * the `{userId, createdAt}` index, for weak words and mistake types.
 */
export async function getGlobalStatsForUser(
  userId: string | null,
  { completionCounts }: { completionCounts?: Promise<Map<string, number>> } = {}
): Promise<DictationGlobalStatsRecord> {
  if (!userId)
    return computeGlobalDictationStats({
      completedVideoCount: 0,
      dueReviewItemCount: 0,
      recentTokenAttempts: [],
      summary: EMPTY_GLOBAL_STATS_SUMMARY,
      totalVideoCount: await getCachedVideoCount(),
    })

  const now = new Date()
  const [
    [facetResult],
    recentTokenAttempts,
    dueReviewItemCount,
    totalVideoCount,
    completedVideoCount,
  ] = await Promise.all([
    DictationAttemptModel.aggregate<GlobalStatsFacetResult>(
      buildGlobalStatsPipeline({ now, userId })
    ),
    DictationAttemptModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(RECENT_TOKEN_ATTEMPT_LIMIT)
      .select(GLOBAL_STATS_TOKEN_PROJECTION)
      .lean<GlobalStatsTokenAttemptDocument[]>(),
    DictationReviewItemModel.countDocuments({
      userId,
      status: { $in: ACTIVE_REVIEW_STATUSES },
    }),
    getCachedVideoCount(),
    countCompletedVideos(
      completionCounts ?? getCompletionCountsForUser(userId)
    ),
  ])

  return computeGlobalDictationStats({
    completedVideoCount,
    dueReviewItemCount,
    now,
    recentTokenAttempts: recentTokenAttempts.map(toGlobalStatsTokenAttempt),
    summary: toGlobalStatsSummary(facetResult),
    totalVideoCount,
  })
}
