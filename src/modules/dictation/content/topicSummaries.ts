import {
  formatLevelRange,
  type DictationLevel,
} from '@/modules/dictation/levels'
import type {
  DictationTopicApiRecord,
  DictationTopicSummaryRecord,
} from '@/modules/dictation/types'

export interface TopicVideoAggregate {
  topicId: string
  lessonCount: number
  levels: ReadonlyArray<DictationLevel | null>
}

export interface TopicSectionAggregate {
  topicId: string
  sectionCount: number
}

/**
 * Merge topics with their aggregated video + section counts into browse-grid
 * summaries. Pure (no DB) so the derivation is unit-tested directly. Topics with
 * no matching aggregate rows get zero counts and a null level range.
 */
export function buildTopicSummaries(
  topics: ReadonlyArray<DictationTopicApiRecord>,
  videoAggregates: ReadonlyArray<TopicVideoAggregate>,
  sectionAggregates: ReadonlyArray<TopicSectionAggregate>
): DictationTopicSummaryRecord[] {
  const videoByTopic = new Map(videoAggregates.map(a => [a.topicId, a]))
  const sectionByTopic = new Map(sectionAggregates.map(a => [a.topicId, a]))

  return topics.map(topic => {
    const video = videoByTopic.get(topic.id)
    const section = sectionByTopic.get(topic.id)

    return {
      ...topic,
      lessonCount: video?.lessonCount ?? 0,
      sectionCount: section?.sectionCount ?? 0,
      levelRange: formatLevelRange(video?.levels ?? []),
    }
  })
}
