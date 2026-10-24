import 'server-only'

import { CACHE_TAGS, createCatalogReader } from '@/lib/db/catalogCache'
import { reviveDates, reviveDatesInList } from '@/lib/db/jsonRecords'
import type {
  DictationSectionApiRecord,
  DictationTopicApiRecord,
  DictationTopicSummaryRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import {
  countAllVideos,
  countNoTopicVideos,
  getTopicBySlug,
  listNoTopicVideos,
  listSectionsForTopic,
  listTopics,
  listTopicSummaries,
  listVideosForTopic,
} from './contentRepository'

/**
 * Cached reads of the shared dictation catalog (topics, sections, videos).
 * Public browse pages read through these; admin pages keep the uncached
 * repository so an editor always sees the database.
 *
 * Every write that changes the catalog must invalidate CACHE_TAGS
 * .dictationCatalog - see adminActions.ts and /api/admin/revalidate.
 */

const RECORD_DATES = ['createdAt', 'updatedAt'] as const

export interface TopicCatalog {
  sections: DictationSectionApiRecord[]
  topic: DictationTopicApiRecord
  videos: DictationVideoApiRecord[]
}

export const getCachedTopics = createCatalogReader({
  key: 'dictation-topics',
  load: listTopics,
  revive: topics =>
    reviveDatesInList<DictationTopicApiRecord>(topics, RECORD_DATES),
  tag: CACHE_TAGS.dictationCatalog,
})

export const getCachedTopicSummaries = createCatalogReader({
  key: 'dictation-topic-summaries',
  load: listTopicSummaries,
  revive: topics =>
    reviveDatesInList<DictationTopicSummaryRecord>(topics, RECORD_DATES),
  tag: CACHE_TAGS.dictationCatalog,
})

export const getCachedNoTopicCount = createCatalogReader({
  key: 'dictation-no-topic-count',
  load: countNoTopicVideos,
  revive: count => count,
  tag: CACHE_TAGS.dictationCatalog,
})

export const getCachedVideoCount = createCatalogReader({
  key: 'dictation-video-count',
  load: countAllVideos,
  revive: count => count,
  tag: CACHE_TAGS.dictationCatalog,
})

export const getCachedNoTopicVideos = createCatalogReader({
  key: 'dictation-no-topic-videos',
  load: listNoTopicVideos,
  revive: videos =>
    reviveDatesInList<DictationVideoApiRecord>(videos, RECORD_DATES),
  tag: CACHE_TAGS.dictationCatalog,
})

/**
 * One topic with its sections and visible videos, as one cache entry: a hit
 * is a single cache read instead of a topic lookup followed by two queries.
 */
async function loadTopicCatalog(slug: string): Promise<TopicCatalog | null> {
  const topic = await getTopicBySlug(slug)

  if (!topic) return null

  const [sections, videos] = await Promise.all([
    listSectionsForTopic(topic.id),
    listVideosForTopic(topic.id),
  ])

  return { sections, topic, videos }
}

const readTopicCatalog = createCatalogReader({
  key: 'dictation-topic-catalog',
  load: loadTopicCatalog,
  revive: catalog =>
    catalog
      ? {
          sections: reviveDatesInList<DictationSectionApiRecord>(
            catalog.sections,
            RECORD_DATES
          ),
          topic: reviveDates<DictationTopicApiRecord>(
            catalog.topic,
            RECORD_DATES
          ),
          videos: reviveDatesInList<DictationVideoApiRecord>(
            catalog.videos,
            RECORD_DATES
          ),
        }
      : null,
  tag: CACHE_TAGS.dictationCatalog,
})

/** Normalized like getTopicBySlug, so "Foo" and "foo" share one entry. */
export function getCachedTopicCatalog(slug: string) {
  return readTopicCatalog(slug.trim().toLowerCase())
}
