import 'server-only'

import { cache } from 'react'

import { DictationSectionModel } from '@/models/dictation/DictationSectionModel'
import { DictationTopicModel } from '@/models/dictation/DictationTopicModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import type { DictationLevel } from '@/modules/dictation/levels'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import type {
  DictationSectionApiRecord,
  DictationTopicApiRecord,
  DictationTopicSummaryRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import {
  buildVideoMongoFilter,
  buildVideoMongoSort,
  paginate,
  type BrowseQuery,
  type Pagination,
} from './browseQuery'

import {
  buildTopicSummaries,
  type TopicSectionAggregate,
  type TopicVideoAggregate,
} from './topicSummaries'

interface TopicLean {
  _id: unknown
  slug: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  hasVideoMedia?: boolean
  order?: number
  createdAt: Date
  updatedAt: Date
}

interface SectionLean {
  _id: unknown
  topicId: unknown
  title: string
  order?: number
  createdAt: Date
  updatedAt: Date
}

function toTopicRecord(topic: TopicLean): DictationTopicApiRecord {
  return {
    id: String(topic._id),
    slug: topic.slug,
    title: topic.title,
    description: topic.description ?? null,
    thumbnailUrl: topic.thumbnailUrl ?? null,
    hasVideoMedia: topic.hasVideoMedia ?? false,
    order: topic.order ?? 0,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  }
}

function toSectionRecord(section: SectionLean): DictationSectionApiRecord {
  return {
    id: String(section._id),
    topicId: String(section.topicId),
    title: section.title,
    order: section.order ?? 0,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  }
}

export async function listTopics(): Promise<DictationTopicApiRecord[]> {
  const topics = await DictationTopicModel.find()
    .sort({ order: 1, title: 1 })
    .lean<TopicLean[]>()

  return topics.map(toTopicRecord)
}

// Wrapped in React cache so generateMetadata + the page body share one query
// per request (they both resolve the same slug).
export const getTopicBySlug = cache(
  async (slug: string): Promise<DictationTopicApiRecord | null> => {
    const topic = await DictationTopicModel.findOne({
      slug: slug.trim().toLowerCase(),
    }).lean<TopicLean | null>()

    return topic ? toTopicRecord(topic) : null
  }
)

export async function listSectionsForTopic(
  topicId: string
): Promise<DictationSectionApiRecord[]> {
  const sections = await DictationSectionModel.find({ topicId })
    .sort({ order: 1, title: 1 })
    .lean<SectionLean[]>()

  return sections.map(toSectionRecord)
}

const VISIBLE_VIDEO_FILTER = { status: { $ne: 'archived' } } as const

/** All non-archived videos filed under a topic (any/no section). */
export async function listVideosForTopic(
  topicId: string
): Promise<DictationVideoApiRecord[]> {
  const videos = await DictationVideoModel.find({
    topicId,
    ...VISIBLE_VIDEO_FILTER,
  })
    .sort({ createdAt: -1 })
    .lean()

  return videos.map(toDictationVideoRecord)
}

/**
 * Videos with no topic (the "Uncategorized" group). `{ topicId: null }` matches
 * both explicit null and absent (pre-backfill) fields in MongoDB.
 */
export async function listNoTopicVideos(): Promise<DictationVideoApiRecord[]> {
  const videos = await DictationVideoModel.find({
    topicId: null,
    ...VISIBLE_VIDEO_FILTER,
  })
    .sort({ createdAt: -1 })
    .lean()

  return videos.map(toDictationVideoRecord)
}

export async function countNoTopicVideos(): Promise<number> {
  return DictationVideoModel.countDocuments({
    topicId: null,
    ...VISIBLE_VIDEO_FILTER,
  })
}

/**
 * Search/filter/sort/paginate the videos within a topic (flat list mode). Uses
 * the shared browseQuery helpers so behavior matches the admin table predicate.
 */
export async function searchVideosInTopic(
  topicId: string,
  query: BrowseQuery
): Promise<{ videos: DictationVideoApiRecord[]; pagination: Pagination }> {
  const filter = {
    topicId,
    ...VISIBLE_VIDEO_FILTER,
    ...buildVideoMongoFilter(query),
  }

  const total = await DictationVideoModel.countDocuments(filter)
  const pagination = paginate(query.page, total)

  const videos = await DictationVideoModel.find(filter)
    .sort(buildVideoMongoSort(query))
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .lean()

  return { videos: videos.map(toDictationVideoRecord), pagination }
}

/** All non-archived videos, for the admin management table. */
export async function listManageableVideos(): Promise<
  DictationVideoApiRecord[]
> {
  const videos = await DictationVideoModel.find(VISIBLE_VIDEO_FILTER)
    .sort({ createdAt: -1 })
    .lean()

  return videos.map(toDictationVideoRecord)
}

/** Every section across all topics (for admin title lookups / dropdowns). */
export async function listAllSections(): Promise<DictationSectionApiRecord[]> {
  const sections = await DictationSectionModel.find()
    .sort({ topicId: 1, order: 1 })
    .lean<SectionLean[]>()

  return sections.map(toSectionRecord)
}

/**
 * Topics with derived level range, section count, and lesson count for the
 * browse grid. Counts are computed live via aggregation (I4) — not stored.
 */
export async function listTopicSummaries(): Promise<
  DictationTopicSummaryRecord[]
> {
  const [topics, videoRows, sectionRows] = await Promise.all([
    listTopics(),
    DictationVideoModel.aggregate<{
      _id: unknown
      lessonCount: number
      levels: Array<DictationLevel | null>
    }>([
      { $match: { topicId: { $ne: null }, status: { $ne: 'archived' } } },
      {
        $group: {
          _id: '$topicId',
          lessonCount: { $sum: 1 },
          levels: { $addToSet: '$level' },
        },
      },
    ]),
    DictationSectionModel.aggregate<{ _id: unknown; sectionCount: number }>([
      { $group: { _id: '$topicId', sectionCount: { $sum: 1 } } },
    ]),
  ])

  const videoAggregates: TopicVideoAggregate[] = videoRows.map(row => ({
    topicId: String(row._id),
    lessonCount: row.lessonCount,
    levels: row.levels,
  }))

  const sectionAggregates: TopicSectionAggregate[] = sectionRows.map(row => ({
    topicId: String(row._id),
    sectionCount: row.sectionCount,
  }))

  return buildTopicSummaries(topics, videoAggregates, sectionAggregates)
}
