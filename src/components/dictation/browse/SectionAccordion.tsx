import { Headphones } from 'lucide-react'

import { EmptyState } from '@/components/journey/EmptyState'
import { PageTag } from '@/components/ui/PageTag'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'

import { BrowseDisclosure } from './BrowseDisclosure'
import type { BrowseVideoItem } from './BrowseVideoList'
import { BrowseVideoListClient } from './BrowseVideoListClient'

export { BrowseVideoList, type BrowseVideoItem } from './BrowseVideoList'

export interface BrowseSectionGroup {
  key: string
  title: string
  videos: BrowseVideoItem[]
}

/**
 * A section starts closed, so its list is a client component that gets plain
 * video records as props and renders the cards only once opened. Passing
 * server-rendered cards as children instead would serialize every closed
 * section's full card tree into the page payload.
 */
type BrowseLabels = Messages['dictation']['browse']

function SectionPanel({
  group,
  canFavorite,
  defaultOpen,
  labels,
}: {
  group: BrowseSectionGroup
  canFavorite: boolean
  defaultOpen: boolean
  labels: BrowseLabels
}) {
  const panelId = `section-${group.key}`
  const doneCount = group.videos.filter(video => video.completions > 0).length
  const finished = group.videos.length > 0 && doneCount >= group.videos.length

  return (
    <BrowseDisclosure
      defaultOpen={defaultOpen}
      panelId={panelId}
      header={
        <>
          <span className="font-sans text-base font-medium">{group.title}</span>
          {/* Progress shows to guests too: their practice is saved. */}
          <PageTag tone={finished ? 'gold' : doneCount > 0 ? 'sky' : 'pale'}>
            {group.videos.length > 0
              ? `${doneCount}/${group.videos.length}`
              : group.videos.length}
          </PageTag>
        </>
      }
    >
      <BrowseVideoListClient
        id={panelId}
        videos={group.videos}
        canFavorite={canFavorite}
        emptyLabel={labels.emptySection}
        labels={labels.card}
        className="border-line border-t p-3"
        priorityCount={0}
      />
    </BrowseDisclosure>
  )
}

export function SectionAccordion({
  groups,
  canFavorite,
  labels = en.dictation.browse,
  openKey = null,
}: {
  groups: BrowseSectionGroup[]
  canFavorite: boolean
  /** The section holding the next video starts open; the rest fold. */
  openKey?: string | null
  /** From the page's `getMessages()`: this stays a server component. */
  labels?: BrowseLabels
}) {
  if (groups.length === 0)
    return (
      <EmptyState
        action={{ href: '/dictation', label: labels.allTopics }}
        body={labels.topicEmpty}
        icon={<Headphones />}
        title={labels.nothingHere}
      />
    )

  return (
    <div className="grid gap-3">
      {groups.map(group => (
        <SectionPanel
          key={group.key}
          group={group}
          canFavorite={canFavorite}
          defaultOpen={group.key === openKey}
          labels={labels}
        />
      ))}
    </div>
  )
}
