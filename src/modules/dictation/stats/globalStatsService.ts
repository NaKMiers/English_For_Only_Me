import 'server-only'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationReviewItemRecord } from '@/modules/dictation/services/dictationReviewItemRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'

import { aggregateGlobalDictationStats } from './globalStats'

export async function getGlobalStatsForOwner(ownerId: string) {
  const [attempts, reviewItems, videos] = await Promise.all([
    DictationAttemptModel.find({
      ownerId,
    })
      .sort({ createdAt: 1 })
      .lean(),
    DictationReviewItemModel.find({
      ownerId,
    }).lean(),
    DictationVideoModel.find({
      ownerId,
    })
      .sort({ createdAt: -1 })
      .lean(),
  ])

  return aggregateGlobalDictationStats({
    attempts: attempts.map(toDictationAttemptRecord),
    ownerId,
    reviewItems: reviewItems.map(toDictationReviewItemRecord),
    videos: videos.map(toDictationVideoRecord),
  })
}
