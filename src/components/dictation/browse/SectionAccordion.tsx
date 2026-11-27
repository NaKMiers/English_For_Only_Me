import { PageTag } from '@/components/ui/PageTag'

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
function SectionPanel({
  group,
  canFavorite,
}: {
  group: BrowseSectionGroup
  canFavorite: boolean
}) {
  const panelId = `section-${group.key}`
  const doneCount = group.videos.filter(video => video.completions > 0).length

  return (
    <BrowseDisclosure
      panelId={panelId}
      header={
        <>
          <span className="font-sans text-base font-semibold">
            {group.title}
          </span>
          <PageTag tone={doneCount > 0 ? 'red' : 'pale'}>
            {canFavorite && group.videos.length > 0
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
        emptyLabel="No lessons in this section yet."
        className="border-line border-t p-3"
        priorityCount={0}
      />
    </BrowseDisclosure>
  )
}

export function SectionAccordion({
  groups,
  canFavorite,
}: {
  groups: BrowseSectionGroup[]
  canFavorite: boolean
}) {
  if (groups.length === 0)
    return (
      <div className="border-line bg-surface rounded-panel border p-6 text-center">
        <p className="font-sans text-lg font-semibold">Nothing here yet</p>
        <p className="text-ink-soft mt-1 text-sm">
          This topic has no lessons yet.
        </p>
      </div>
    )

  return (
    <div className="grid gap-3">
      {groups.map(group => (
        <SectionPanel
          key={group.key}
          group={group}
          canFavorite={canFavorite}
        />
      ))}
    </div>
  )
}
