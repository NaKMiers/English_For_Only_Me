import type { BrowseVideoItem } from '@/components/dictation/browse/SectionAccordion'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

/**
 * Map a video record into the browse-card view-model. Shared by every browse
 * surface (topic, favorites, uncategorized, in-progress) so the card shape and
 * progress signals stay consistent.
 */
export function toBrowseItem(
  video: DictationVideoApiRecord,
  {
    completionCounts,
    favoritedSet,
    inProgressSet,
  }: {
    completionCounts: Map<string, number>
    favoritedSet: Set<string>
    inProgressSet: Set<string>
  }
): BrowseVideoItem {
  return {
    id: video.id,
    title: video.title,
    level: video.level,
    practiceHref: hasDictationTranscript(video)
      ? `/dictation/videos/${video.id}/practice`
      : null,
    favorited: favoritedSet.has(video.id),
    completions: completionCounts.get(video.id) ?? 0,
    inProgress: inProgressSet.has(video.id),
    thumbnailUrl: video.thumbnailUrl,
    youtubeVideoId: video.youtubeVideoId,
  }
}
