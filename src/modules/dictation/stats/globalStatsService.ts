import 'server-only'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getCompletionCountsForUser } from '@/modules/dictation/content/progressRepository'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'

import { aggregateGlobalDictationStats } from './globalStats'

export async function getGlobalStatsForUser(userId: string) {
  const [attempts, reviewItems, videos, completionCounts] = await Promise.all([
    DictationAttemptModel.find({
      userId,
    })
      .sort({ createdAt: 1 })
      .lean(),
    DictationReviewItemModel.find({
      userId,
    }).lean(),
    DictationVideoModel.find({})
      .sort({ createdAt: -1 })
      .lean(),
    getCompletionCountsForUser(userId),
  ])

  return aggregateGlobalDictationStats({
    attempts: attempts.map(toDictationAttemptRecord),
    completedVideoIds: new Set(completionCounts.keys()),
    userId,
    reviewItems: reviewItems.map(toDictationReviewItemRecord),
    videos: videos.map(toDictationVideoRecord),
  })
}
