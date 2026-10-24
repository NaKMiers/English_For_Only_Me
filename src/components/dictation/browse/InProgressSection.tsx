import { PlayCircle } from 'lucide-react'

import { PageTag } from '@/components/ui/PageTag'

import { BrowseDisclosure } from './BrowseDisclosure'
import { BrowseVideoList, type BrowseVideoItem } from './BrowseVideoList'

/**
 * Collapsible "resume" panel on the dictation landing page listing every video
 * with an unfinished session, most recently practiced first. Renders nothing
 * when there is no in-progress work. A server component: it starts open, so
 * its cards are server-rendered and only the toggle and the favorite stars
 * hydrate.
 */
export function InProgressSection({
  videos,
  canFavorite,
}: {
  videos: BrowseVideoItem[]
  canFavorite: boolean
}) {
  if (videos.length === 0) return null

  const panelId = 'dictation-in-progress'

  return (
    <BrowseDisclosure
      panelId={panelId}
      defaultOpen
      header={
        <>
          <PlayCircle
            aria-hidden="true"
            className="text-manga-red size-5 shrink-0"
          />
          <span className="font-sans text-base font-black">In Progress</span>
          <PageTag tone="red">{videos.length}</PageTag>
        </>
      }
    >
      <BrowseVideoList
        id={panelId}
        videos={videos}
        canFavorite={canFavorite}
        className="border-manga-black border-t-3 p-3"
      />
    </BrowseDisclosure>
  )
}
