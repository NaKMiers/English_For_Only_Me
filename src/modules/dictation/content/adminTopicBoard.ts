import type {
  AdminSectionVideo,
  AdminTopicData,
} from '@/components/dictation/admin/AdminTopicCard'
import type {
  DictationSectionApiRecord,
  DictationTopicApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

export function toAdminSectionVideo(
  video: DictationVideoApiRecord
): AdminSectionVideo {
  return {
    id: video.id,
    title: video.title,
    level: video.level,
    status: video.status,
    thumbnailUrl: video.thumbnailUrl,
    youtubeVideoId: video.youtubeVideoId,
  }
}

function groupBy<T>(items: T[], keyOf: (item: T) => string | null) {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const key = keyOf(item)

    if (!key) continue

    const bucket = groups.get(key) ?? []
    bucket.push(item)
    groups.set(key, bucket)
  }

  return groups
}

/**
 * Assemble the admin topic board from three flat, already-sorted lists (every
 * topic, every section, every filed video) instead of two queries per topic.
 * Input order is kept inside each group, so sections and videos read in the
 * same order the per-topic queries returned.
 */
export function buildAdminTopicBoard({
  sections,
  topics,
  videos,
}: {
  sections: DictationSectionApiRecord[]
  topics: DictationTopicApiRecord[]
  videos: DictationVideoApiRecord[]
}): AdminTopicData[] {
  const sectionsByTopic = groupBy(sections, section => section.topicId)
  const videosByTopic = groupBy(videos, video => video.topicId)

  return topics.map(topic => {
    const topicVideos = videosByTopic.get(topic.id) ?? []
    const bySection = new Map<string, AdminSectionVideo[]>()
    const ungrouped: AdminSectionVideo[] = []

    for (const video of topicVideos) {
      const item = toAdminSectionVideo(video)

      if (video.sectionId) {
        const bucket = bySection.get(video.sectionId) ?? []
        bucket.push(item)
        bySection.set(video.sectionId, bucket)
      } else ungrouped.push(item)
    }

    return {
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      thumbnailUrl: topic.thumbnailUrl,
      order: topic.order,
      hasVideoMedia: topic.hasVideoMedia,
      videoCount: topicVideos.length,
      sections: (sectionsByTopic.get(topic.id) ?? []).map(section => ({
        id: section.id,
        title: section.title,
        videos: bySection.get(section.id) ?? [],
      })),
      ungrouped,
    }
  })
}
