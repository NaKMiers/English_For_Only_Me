'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { MangaButton } from '@/components/ui/MangaButton'
import { DICTATION_RECENT_VIDEOS } from '@/constants/dictation'
import { PAGE_TAG_TONES } from '@/constants/theme'
import { cn } from '@/lib/utils'
import {
  getDictationStatusLabel,
  getDictationStatusTone,
  type DictationStatusTone,
} from '@/modules/dictation/statusDisplay'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'
import { getDictationVideoAction } from '@/modules/dictation/videoReadiness'

import { DictationVideoThumbnail } from './DictationVideoThumbnail'

const VIDEOS_PER_PAGE = 9

interface Props {
  videos: DictationVideoApiRecord[]
}

interface RecentVideoAction {
  href: string
  label: string
}

interface RecentVideoCard {
  action: RecentVideoAction | null
  id: string
  meta: string
  statusLabel: string
  statusTone: DictationStatusTone
  thumbnailUrl: string | null
  title: string
  youtubeVideoId: string | null
}

function getVideoMeta(video: DictationVideoApiRecord) {
  const transcript =
    video.transcriptStatus === 'manualAdded'
      ? 'transcript added'
      : 'needs transcript'
  const sentences =
    video.sentenceCount > 0 ? `${video.sentenceCount} sentences` : transcript

  return `${sentences} - ${getDictationStatusLabel(video.status)}`
}

function getRecentVideos(videos: DictationVideoApiRecord[]): RecentVideoCard[] {
  if (videos.length > 0)
    return videos.map(video => ({
      action: getDictationVideoAction(video),
      id: video.id,
      meta: getVideoMeta(video),
      statusLabel: getDictationStatusLabel(video.status),
      statusTone: getDictationStatusTone(video.status),
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      youtubeVideoId: video.youtubeVideoId,
    }))

  return DICTATION_RECENT_VIDEOS.map(video => ({
    ...video,
    action: null,
    statusLabel: video.status,
    statusTone: 'pale',
    thumbnailUrl: null,
    youtubeVideoId: null,
  }))
}

export function DictationRecentVideosGrid({ videos }: Props) {
  const [page, setPage] = useState(1)
  const recentVideos = useMemo(() => getRecentVideos(videos), [videos])
  const pageCount = Math.max(
    1,
    Math.ceil(recentVideos.length / VIDEOS_PER_PAGE)
  )
  const activePage = Math.min(page, pageCount)
  const pageStart = (activePage - 1) * VIDEOS_PER_PAGE
  const visibleVideos = recentVideos.slice(
    pageStart,
    pageStart + VIDEOS_PER_PAGE
  )

  return (
    <section
      aria-label="Recent dictation videos"
      className="grid gap-3"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {visibleVideos.map(video => (
          <article
            key={video.id}
            className="border-manga-black bg-manga-white grid min-w-0 gap-2 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]"
          >
            <DictationVideoThumbnail
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              youtubeVideoId={video.youtubeVideoId}
              sizes="(min-width: 768px) 28vw, 100vw"
            />
            <strong className="font-sans text-base leading-tight font-black wrap-break-word">
              {video.title}
            </strong>
            <span className="text-manga-ink-soft text-sm leading-5 font-semibold">
              {video.meta}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'border-manga-black w-fit rounded-none border-2 font-black shadow-[2px_2px_0_var(--manga-black)]',
                PAGE_TAG_TONES[video.statusTone]
              )}
            >
              {video.statusLabel}
            </Badge>
            {video.action ? (
              <MangaButton
                href={video.action.href}
                tone="paper"
                className="min-h-10 px-3 py-1 text-xs"
              >
                {video.action.label}
              </MangaButton>
            ) : null}
          </article>
        ))}
      </div>

      {pageCount > 1 ? (
        <nav
          aria-label="Recent dictation videos pagination"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-manga-ink-soft text-sm leading-5 font-black">
            Page {activePage} of {pageCount}
          </span>
          <div className="flex flex-wrap gap-2">
            <MangaButton
              type="button"
              tone="paper"
              disabled={activePage === 1}
              onClick={() => setPage(Math.max(1, activePage - 1))}
              className="min-h-10 px-3 py-1 text-xs"
              icon={
                <ChevronLeft
                  aria-hidden="true"
                  className="size-4"
                />
              }
            >
              Previous
            </MangaButton>
            <MangaButton
              type="button"
              tone="paper"
              disabled={activePage === pageCount}
              onClick={() => setPage(Math.min(pageCount, activePage + 1))}
              className="min-h-10 px-3 py-1 text-xs"
              icon={
                <ChevronRight
                  aria-hidden="true"
                  className="size-4"
                />
              }
            >
              Next
            </MangaButton>
          </div>
        </nav>
      ) : null}
    </section>
  )
}
