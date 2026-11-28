import type {
  DictationSectionApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

/**
 * The video after `currentId` in the topic's course order (its sections in
 * order, then videos with no section), skipping videos that cannot be
 * practiced yet. Null for the last video. Pure: the practice page feeds it
 * the cached topic catalog, so finding the next stop costs no query.
 */
export function nextVideoInTopic(
  catalog: {
    sections: Pick<DictationSectionApiRecord, 'id'>[]
    videos: DictationVideoApiRecord[]
  },
  currentId: string
): DictationVideoApiRecord | null {
  const sectionIndex = new Map(
    catalog.sections.map((section, index) => [section.id, index])
  )
  const ordered = catalog.videos
    .map((video, index) => ({ index, video }))
    .sort((left, right) => {
      const leftSection =
        sectionIndex.get(left.video.sectionId ?? '') ?? Number.MAX_SAFE_INTEGER
      const rightSection =
        sectionIndex.get(right.video.sectionId ?? '') ?? Number.MAX_SAFE_INTEGER

      return leftSection - rightSection || left.index - right.index
    })
    .map(item => item.video)
  const position = ordered.findIndex(video => video.id === currentId)

  if (position < 0) return null

  return (
    ordered.slice(position + 1).find(video => hasDictationTranscript(video)) ??
    null
  )
}
