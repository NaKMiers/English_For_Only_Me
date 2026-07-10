'use client'

import { Check, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'

import { FavoriteButton } from './FavoriteButton'

export interface BrowseVideoItem {
  id: string
  title: string
  level: string | null
  practiceHref: string | null
  favorited: boolean
  done: boolean
  thumbnailUrl: string | null
  youtubeVideoId: string | null
}

export interface BrowseSectionGroup {
  key: string
  title: string
  videos: BrowseVideoItem[]
}

function VideoRow({
  video,
  canFavorite,
}: {
  video: BrowseVideoItem
  canFavorite: boolean
}) {
  return (
    <li className="border-manga-black bg-manga-white flex items-center justify-between gap-3 border-2 p-2">
      <div className="flex min-w-0 items-center gap-3">
        <DictationVideoThumbnail
          title={video.title}
          thumbnailUrl={video.thumbnailUrl}
          youtubeVideoId={video.youtubeVideoId}
          sizes="112px"
          className="w-28 shrink-0"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {video.done && (
            <Check
              aria-label="Completed"
              className="text-manga-red size-4 shrink-0"
            />
          )}
          {video.level && <PageTag tone="sky">{video.level}</PageTag>}
          <span className="truncate font-sans text-sm font-black">
            {video.title}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <FavoriteButton
          videoId={video.id}
          initialFavorited={video.favorited}
          canFavorite={canFavorite}
        />
        {video.practiceHref ? (
          <Link
            href={video.practiceHref}
            className="border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-9 items-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
          >
            Practice
          </Link>
        ) : (
          <span className="text-manga-ink-soft text-xs font-black uppercase">
            No transcript
          </span>
        )}
      </div>
    </li>
  )
}

export function BrowseVideoList({
  videos,
  canFavorite,
  id,
  emptyLabel = 'No lessons here yet.',
  className,
}: {
  videos: BrowseVideoItem[]
  canFavorite: boolean
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
            canFavorite={canFavorite}
          />
        ))
      )}
    </ul>
  )
}

function SectionPanel({
  group,
  canFavorite,
}: {
  group: BrowseSectionGroup
  canFavorite: boolean
}) {
  const [open, setOpen] = useState(false)
  const panelId = `section-${group.key}`
  const doneCount = group.videos.filter(video => video.done).length

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
          <PageTag tone={doneCount > 0 ? 'red' : 'pale'}>
            {canFavorite && group.videos.length > 0
              ? `${doneCount}/${group.videos.length}`
              : group.videos.length}
          </PageTag>
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
          canFavorite={canFavorite}
          emptyLabel="No lessons in this section yet."
          className="border-manga-black border-t-3 p-3"
        />
      )}
    </div>
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
          canFavorite={canFavorite}
        />
      ))}
    </div>
  )
}
