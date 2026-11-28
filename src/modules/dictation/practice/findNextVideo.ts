import 'server-only'

import {
  getCachedTopicCatalog,
  getCachedTopics,
} from '@/modules/dictation/content/catalogReaders'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'

import { nextVideoInTopic } from './nextVideo'

/** Where a finished video sends the learner: the next one of its topic. */
export interface PracticeNextVideo {
  href: string
  title: string
  topicTitle: string
}

/**
 * The next stop after a video (practice finish, results): the next video of this video's topic, from
 * the cached catalog only (no query per request). Null for the last video
 * or a video with no topic; the finish screen then points at the landing.
 */
export async function findNextVideo(
  video: DictationVideoApiRecord
): Promise<PracticeNextVideo | null> {
  if (!video.topicId) return null

  try {
    const topic = (await getCachedTopics()).find(
      item => item.id === video.topicId
    )
    const catalog = topic ? await getCachedTopicCatalog(topic.slug) : null
    const next = catalog ? nextVideoInTopic(catalog, video.id) : null

    return next && topic
      ? {
          href: `/dictation/videos/${next.id}/practice`,
          title: next.title,
          topicTitle: topic.title,
        }
      : null
  } catch (error) {
    // A cold or failing catalog read only loses the next stop's target.
    console.error('Next video lookup failed.', error)
    return null
  }
}
