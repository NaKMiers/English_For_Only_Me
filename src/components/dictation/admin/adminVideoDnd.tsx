'use client'

import { GripVertical, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import { removeVideoFromSectionAction } from '@/modules/dictation/content/adminActions'

export { reorderIds } from '@/modules/dictation/content/reorder'

// Distinct drag payload types so the three drag interactions on /admin/topics
// (move a video, reorder topics, reorder sections) never cross-activate each
// other's drop zones. Browsers lowercase custom types in dataTransfer.types.
export const MIME_VIDEO = 'application/x-efom-video'
export const MIME_TOPIC = 'application/x-efom-topic'
export const MIME_SECTION = 'application/x-efom-section'

export interface AdminSectionVideo {
  id: string
  title: string
  level: string | null
  thumbnailUrl: string | null
  youtubeVideoId: string | null
}

/**
 * A drop zone that only reacts to drags carrying `accept`. Highlights while a
 * matching item is dragged over; calls onDrop(id) with the dragged id.
 */
export function DropZone({
  accept,
  onDrop,
  onEnter,
  className,
  children,
}: {
  accept: string
  onDrop: (id: string) => void
  onEnter?: () => void
  className?: string
  children: ReactNode
}) {
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={event => {
        if (!event.dataTransfer.types.includes(accept)) return
        event.preventDefault()
        if (!over) {
          setOver(true)
          onEnter?.()
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        if (!event.dataTransfer.types.includes(accept)) return
        event.preventDefault()
        setOver(false)
        const id = event.dataTransfer.getData(accept)
        if (id) onDrop(id)
      }}
      className={cn(className, over && 'ring-manga-red ring-3')}
    >
      {children}
    </div>
  )
}

/** A draggable grip handle that carries `id` under the `mime` type. */
export function ReorderHandle({
  mime,
  id,
  label,
}: {
  mime: string
  id: string
  label: string
}) {
  return (
    <button
      type="button"
      draggable
      aria-label={label}
      onDragStart={event => {
        event.dataTransfer.setData(mime, id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      className="border-manga-black bg-manga-white grid size-8 shrink-0 cursor-grab place-items-center border-2 active:cursor-grabbing"
    >
      <GripVertical
        aria-hidden="true"
        className="text-manga-ink-soft size-4"
      />
    </button>
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
      onDragStart={event => {
        event.dataTransfer.setData(MIME_VIDEO, video.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
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

