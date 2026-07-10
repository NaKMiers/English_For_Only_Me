'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'

export interface BrowseVideoItem {
  id: string
  title: string
  level: string | null
  practiceHref: string | null
}

export interface BrowseSectionGroup {
  key: string
  title: string
  videos: BrowseVideoItem[]
}

function VideoRow({ video }: { video: BrowseVideoItem }) {
  return (
    <li className="border-manga-black bg-manga-white flex items-center justify-between gap-3 border-2 p-3">
      <div className="flex min-w-0 items-center gap-2">
        {video.level && <PageTag tone="sky">{video.level}</PageTag>}
        <span className="truncate font-sans text-sm font-black">
          {video.title}
        </span>
      </div>
      {video.practiceHref ? (
        <Link
          href={video.practiceHref}
          className="border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-9 shrink-0 items-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
        >
          Practice
        </Link>
      ) : (
        <span className="text-manga-ink-soft shrink-0 text-xs font-black uppercase">
          No transcript
        </span>
      )}
    </li>
  )
}

export function BrowseVideoList({
  videos,
  id,
  emptyLabel = 'No lessons here yet.',
  className,
}: {
  videos: BrowseVideoItem[]
  id?: string
  emptyLabel?: string
  className?: string
}) {
  return (
    <ul
      id={id}
      className={cn('grid gap-2', className)}
    >
      {videos.length === 0 ? (
        <li className="text-manga-ink-soft p-2 text-sm">{emptyLabel}</li>
      ) : (
        videos.map(video => (
          <VideoRow
            key={video.id}
            video={video}
          />
        ))
      )}
    </ul>
  )
}

function SectionPanel({ group }: { group: BrowseSectionGroup }) {
  const [open, setOpen] = useState(false)
  const panelId = `section-${group.key}`

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
          <span className="font-sans text-base font-black">{group.title}</span>
          <PageTag tone="pale">{group.videos.length}</PageTag>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <BrowseVideoList
          id={panelId}
          videos={group.videos}
          emptyLabel="No lessons in this section yet."
          className="border-manga-black border-t-3 p-3"
        />
      )}
    </div>
  )
}

export function SectionAccordion({ groups }: { groups: BrowseSectionGroup[] }) {
  if (groups.length === 0)
    return (
      <div className="border-manga-black bg-manga-white border-3 p-6 text-center shadow-[4px_4px_0_var(--manga-black)]">
        <p className="font-sans text-lg font-black">Nothing here yet</p>
        <p className="text-manga-ink-soft mt-1 text-sm">
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
        />
      ))}
    </div>
  )
}
