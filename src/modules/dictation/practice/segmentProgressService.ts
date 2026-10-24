import 'server-only'

import { Types } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'

import {
  buildSegmentProgressPipeline,
  type SegmentProgressGroup,
  type SegmentProgressRow,
  toSegmentProgressRow,
} from './segmentProgress'

/**
 * The learner's progress rows for a video (or one segment of it), in ONE
 * aggregation over their own attempts. A null owner (first-time visitor) owns
 * no attempts, so nothing is queried.
 */
export async function loadSegmentProgressRows({
  segmentId,
  userId,
  videoId,
}: {
  segmentId?: string
  userId: string | null
  videoId: string
}): Promise<SegmentProgressRow[]> {
  if (!userId) return []

  const groups = await DictationAttemptModel.aggregate<SegmentProgressGroup>(
    buildSegmentProgressPipeline({
      userId,
      videoId: new Types.ObjectId(videoId),
      ...(segmentId ? { segmentId: new Types.ObjectId(segmentId) } : {}),
    })
  )

  return groups.map(toSegmentProgressRow)
}
