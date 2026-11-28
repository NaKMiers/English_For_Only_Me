import 'server-only'

import {
  getCachedTopics,
  getCachedVideoTopicIds,
} from '@/modules/dictation/content/catalogReaders'
import { getCompletionCountsForUser } from '@/modules/dictation/content/progressRepository'

/** A video's topic on the learner's journey: finished videos of how many. */
export interface VideoTopicRecord {
  done: number
  topicTitle: string
  total: number
}

/**
 * The topic record of a video for this learner, from the cached catalog and
 * their completion counts: what the session end turns into "+1 on TED, 3 to
 * go" with `advanceTopicRecord`. Null for a video outside any topic, or a
 * learner with no practice identity yet.
 */
export async function loadVideoTopicRecord({
  topicId,
  userId,
}: {
  topicId: string | null | undefined
  userId: string | null
}): Promise<VideoTopicRecord | null> {
  if (!topicId || !userId) return null

  try {
    const [topics, videoTopicIds, completionCounts] = await Promise.all([
      getCachedTopics(),
      getCachedVideoTopicIds(),
      getCompletionCountsForUser(userId),
    ])
    const topic = topics.find(item => item.id === topicId)

    if (!topic) return null

    const videos = videoTopicIds.filter(video => video.topicId === topicId)

    return {
      done: videos.filter(video => (completionCounts.get(video.id) ?? 0) > 0)
        .length,
      topicTitle: topic.title,
      total: videos.length,
    }
  } catch (error) {
    // A cold or failing catalog read only loses the journey line.
    console.error('Topic record lookup failed.', error)
    return null
  }
}
