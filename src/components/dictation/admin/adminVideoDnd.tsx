'use client'

import { GripVertical, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import { removeVideoFromSectionAction } from '@/modules/dictation/content/adminActions'

export const DRAG_MIME = 'text/plain'

export interface AdminSectionVideo {
  id: string
  title: string
  level: string | null
  thumbnailUrl: string | null
  youtubeVideoId: string | null
}

/** A div that accepts a dropped video row and highlights while dragged over. */
export function DropZone({
  onDropVideo,
  onEnter,
  className,
  children,
}: {
  onDropVideo: (videoId: string) => void
  onEnter?: () => void
  className?: string
  children: ReactNode
}) {
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={event => {
        event.preventDefault()
        if (!over) {
          setOver(true)
          onEnter?.()
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault()
        setOver(false)
        const videoId = event.dataTransfer.getData(DRAG_MIME)
        if (videoId) onDropVideo(videoId)
      }}
      className={cn(className, over && 'ring-manga-red ring-3')}
    >
      {children}
    </div>
  )
}

/**
 * Draggable video row (grip handle carries the video id). When `sectioned`, also
 * shows a Remove button that unassigns it from its section (never deletes).
 */
export function DraggableVideoRow({
  video,
  sectioned,
}: {
  video: AdminSectionVideo
  sectioned: boolean
}) {
  return (
    <li
      draggable
      onDragStart={event => event.dataTransfer.setData(DRAG_MIME, video.id)}
      className="border-manga-black bg-manga-white flex cursor-grab items-center gap-2 border-2 p-2 active:cursor-grabbing"
    >
      <GripVertical
        aria-hidden="true"
        className="text-manga-ink-soft size-4 shrink-0"
      />
      <DictationVideoThumbnail
        title={video.title}
        thumbnailUrl={video.thumbnailUrl}
        youtubeVideoId={video.youtubeVideoId}
        sizes="96px"
        className="w-24 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-black">
        {video.title}
      </span>
      {video.level && <PageTag tone="sky">{video.level}</PageTag>}
      <Link
        href={`/dictation/videos/${video.id}/edit`}
        className="border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-9 shrink-0 items-center gap-1 border-2 px-3 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)]"
      >
        <Pencil
          aria-hidden="true"
          className="size-3"
        />{' '}
        Captions
      </Link>
      {sectioned && (
        <form
          action={removeVideoFromSectionAction}
          className="shrink-0"
        >
          <input
            type="hidden"
            name="videoId"
            value={video.id}
          />
          <button
            type="submit"
            className="border-manga-black bg-manga-white hover:bg-manga-pale-red inline-flex min-h-9 items-center border-2 px-3 font-sans text-xs font-black uppercase"
          >
            Remove
          </button>
        </form>
      )}
    </li>
  )
}
