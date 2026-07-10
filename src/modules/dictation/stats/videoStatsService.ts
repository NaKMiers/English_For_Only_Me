import 'server-only'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { aggregateVideoStats } from '@/modules/dictation/stats/videoStats'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'

export async function getVideoStatsForUser({
  userId,
  videoId,
}: {
  userId: string
  videoId: string
}) {
  const [attempts, segments] = await Promise.all([
    DictationAttemptModel.find({
      userId,
      videoId,
    })
      .sort({ createdAt: 1 })
      .lean(),
    DictationSegmentModel.find({
      videoId,
    })
      .sort({ order: 1 })
      .lean(),
  ])

  return aggregateVideoStats({
    attempts: attempts.map(toDictationAttemptRecord),
    segments: segments.map(toDictationSegmentRecord),
  })
}
