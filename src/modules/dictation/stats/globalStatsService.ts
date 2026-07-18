import 'server-only'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getCompletionCountsForUser } from '@/modules/dictation/content/progressRepository'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'

import { aggregateGlobalDictationStats } from './globalStats'

// Null when the viewer has no practice identity yet: the catalog (videos) still
// loads so totals render, but per-user rows are skipped rather than queried with
// an empty/invalid owner.
export async function getGlobalStatsForUser(userId: string | null) {
  const [attempts, reviewItems, videos, completionCounts] = await Promise.all([
    userId
      ? DictationAttemptModel.find({
          userId,
        })
          .sort({ createdAt: 1 })
          .lean()
      : Promise.resolve([]),
    userId
      ? DictationReviewItemModel.find({
          userId,
        }).lean()
      : Promise.resolve([]),
    DictationVideoModel.find({})
      .sort({ createdAt: -1 })
      .lean(),
    userId
      ? getCompletionCountsForUser(userId)
      : Promise.resolve<Map<string, number>>(new Map()),
  ])

  return aggregateGlobalDictationStats({
    attempts: attempts.map(toDictationAttemptRecord),
    completedVideoIds: new Set(completionCounts.keys()),
    userId: userId ?? '',
    reviewItems: reviewItems.map(toDictationReviewItemRecord),
    videos: videos.map(toDictationVideoRecord),
  })
}
