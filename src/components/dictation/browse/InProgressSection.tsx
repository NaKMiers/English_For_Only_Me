'use client'

import { ChevronDown, PlayCircle } from 'lucide-react'
import { useState } from 'react'

import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'

import { BrowseVideoList, type BrowseVideoItem } from './SectionAccordion'

/**
 * Collapsible "resume" panel on the dictation landing page listing every video
 * with an unfinished session, most recently practiced first. Renders nothing
 * when there is no in-progress work.
 */
export function InProgressSection({
  videos,
  canFavorite,
}: {
  videos: BrowseVideoItem[]
  canFavorite: boolean
}) {
  const [open, setOpen] = useState(true)

  if (videos.length === 0) return null

  const panelId = 'dictation-in-progress'

  return (
    <div className="border-manga-black bg-manga-white border-3 shadow-[4px_4px_0_var(--manga-black)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <PlayCircle
            aria-hidden="true"
            className="text-manga-red size-5 shrink-0"
          />
          <span className="font-sans text-base font-black">In Progress</span>
          <PageTag tone="red">{videos.length}</PageTag>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <BrowseVideoList
          id={panelId}
          videos={videos}
          canFavorite={canFavorite}
          className="border-manga-black border-t-3 p-3"
        />
      )}
    </div>
  )
}
