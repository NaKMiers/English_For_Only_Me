'use client'

import { GripVertical } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { DictationVideoStatus } from '@/modules/dictation/types'

export { reorderIds } from '@/modules/dictation/content/reorder'

// Distinct drag payload types so the three drag interactions on /admin/topics
// (move a video, reorder topics, reorder sections) never cross-activate each
// other's drop zones. Browsers lowercase custom types in dataTransfer.types.
export const MIME_VIDEO = 'application/x-efom-video'
export const MIME_VIDEO_SECTION = 'application/x-efom-video-section'
export const MIME_TOPIC = 'application/x-efom-topic'
export const MIME_SECTION = 'application/x-efom-section'

export interface AdminSectionVideo {
  id: string
  title: string
  level: string | null
  status: DictationVideoStatus
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
