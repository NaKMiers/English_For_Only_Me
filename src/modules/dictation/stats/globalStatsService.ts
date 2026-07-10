import 'server-only'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'

import { aggregateGlobalDictationStats } from './globalStats'

export async function getGlobalStatsForUser(userId: string) {
  const [attempts, reviewItems, videos] = await Promise.all([
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
  ])

  return aggregateGlobalDictationStats({
    attempts: attempts.map(toDictationAttemptRecord),
    userId,
    reviewItems: reviewItems.map(toDictationReviewItemRecord),
    videos: videos.map(toDictationVideoRecord),
  })
}
