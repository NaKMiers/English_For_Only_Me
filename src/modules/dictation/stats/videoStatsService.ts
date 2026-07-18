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
  // Null when the viewer has no practice identity yet: segment totals still
  // render, but no attempts are theirs, so we skip the attempt query entirely
  // rather than match on an empty/invalid owner.
  userId: string | null
  videoId: string
}) {
  const [attempts, segments] = await Promise.all([
    userId
      ? DictationAttemptModel.find({
          userId,
          videoId,
        })
          .sort({ createdAt: 1 })
          .lean()
      : Promise.resolve([]),
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
