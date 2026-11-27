import { PlayCircle } from 'lucide-react'

import { PageTag } from '@/components/ui/PageTag'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'

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
  labels = en.dictation.browse,
}: {
  videos: BrowseVideoItem[]
  canFavorite: boolean
  /** From the page's `getMessages()`: this stays a server component. */
  labels?: Messages['dictation']['browse']
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
            className="text-brand size-5 shrink-0"
          />
          <span className="font-sans text-base font-semibold">
            {labels.inProgress}
          </span>
          <PageTag tone="red">{videos.length}</PageTag>
        </>
      }
    >
      <BrowseVideoList
        id={panelId}
        videos={videos}
        canFavorite={canFavorite}
        labels={labels.card}
        className="border-line border-t p-3"
      />
    </BrowseDisclosure>
  )
}
