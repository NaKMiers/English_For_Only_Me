'use client'

import { GripVertical, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { DragEvent, ReactNode } from 'react'
import { useTransition } from 'react'

import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { updateVideoLevelAction } from '@/modules/dictation/content/adminActions'
import {
  DICTATION_LEVELS,
  type DictationLevel,
} from '@/modules/dictation/levels'
import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from '@/modules/dictation/statusDisplay'
import type { DictationVideoStatus } from '@/modules/dictation/types'

/** Click-to-edit level badge; changes persist immediately, without touching topic/section. */
function AdminVideoLevelBadge({
  videoId,
  level,
}: {
  videoId: string
  level: string | null
}) {
  const [, startTransition] = useTransition()

  return (
    // Stops the click from bubbling to an ancestor selectable row's onClick:
    // Select's popup renders in a portal, but React re-parents portal events
    // onto this element's tree for bubbling purposes, not the popup's DOM parent.
    <div onClick={event => event.stopPropagation()}>
      <Select
        value={level ?? ''}
        onValueChange={value => {
          startTransition(async () => {
            await updateVideoLevelAction(
              videoId,
              (value || null) as DictationLevel | null
            )
          })
        }}
      >
        <SelectTrigger
          size="sm"
          onKeyDown={event => event.stopPropagation()}
          className={cn(
            'min-h-6 gap-1 border-2 px-2 py-0 text-xs font-black shadow-none',
            level
              ? 'bg-sky-100 text-sky-950'
              : 'bg-manga-white text-manga-ink-soft'
          )}
        >
          <SelectValue placeholder="No level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No level</SelectItem>
          {DICTATION_LEVELS.map(option => (
            <SelectItem
              key={option}
              value={option}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export interface AdminVideoItem {
  id: string
  title: string
  level: string | null
  status?: DictationVideoStatus | null
  thumbnailUrl: string | null
  youtubeVideoId: string | null
}

/** Whether a drop lands before or after the hovered row (by cursor Y midpoint). */
export function dropPlacement(
  event: DragEvent<HTMLElement>
): 'before' | 'after' {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
}

/**
 * Shared admin video row: grip handle, thumbnail, title, level + status badges,
 * an Edit (captions) link, and a trailing `actions` slot. Both /admin/videos
 * (selectable, with a checkbox) and /admin/topics (drag to move/reorder within a
 * section) render this so the two surfaces stay visually identical.
 *
 * Drag model: the row and its grip both start a drag by writing `onDragStartData`
 * to the dataTransfer. Dropping another row that carries `acceptReorderMime` onto
 * this row calls `onReorder` - returning true marks the drop handled and stops it
 * bubbling to any enclosing move/unassign DropZone.
 */
export function AdminVideoRow({
  video,
  gripLabel,
  onDragStartData,
  acceptReorderMime,
  onReorder,
  selectable = false,
  selected = false,
  onToggleSelect,
  meta,
  actions,
}: {
  video: AdminVideoItem
  gripLabel: string
  onDragStartData: (dataTransfer: DataTransfer) => void
  acceptReorderMime: string
  onReorder?: (
    draggedId: string,
    targetId: string,
    placement: 'before' | 'after'
  ) => boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  meta?: ReactNode
  actions?: ReactNode
}) {
  function startDrag(event: DragEvent<HTMLElement>) {
    onDragStartData(event.dataTransfer)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <li
      draggable
      onDragStart={startDrag}
      onDragOver={event => {
        if (!event.dataTransfer.types.includes(acceptReorderMime)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={event => {
        if (!event.dataTransfer.types.includes(acceptReorderMime)) return
        event.preventDefault()
        const draggedId = event.dataTransfer.getData(acceptReorderMime)
        const handled = draggedId
          ? onReorder?.(draggedId, video.id, dropPlacement(event))
          : false
        if (handled) event.stopPropagation()
      }}
      onClick={selectable ? onToggleSelect : undefined}
      onKeyDown={
        selectable
          ? event => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onToggleSelect?.()
            }
          : undefined
      }
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      className={cn(
        // min-w-0: this row is a grid item; without it the truncated (nowrap)
        // title forces the row's min-content to the full title width, overflowing
        // the viewport on narrow screens instead of truncating.
        'border-manga-black bg-manga-white flex min-w-0 cursor-grab flex-wrap items-center gap-2 border-2 p-2 active:cursor-grabbing',
        selectable && 'hover:bg-manga-paper-soft'
      )}
    >
      <button
        type="button"
        draggable
        aria-label={gripLabel}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
        onDragStart={startDrag}
        className="border-manga-black bg-manga-white grid size-8 shrink-0 cursor-grab place-items-center border-2 active:cursor-grabbing"
      >
        <GripVertical
          aria-hidden="true"
          className="text-manga-ink-soft size-4"
        />
      </button>
      {selectable && (
        <span
          aria-hidden="true"
          className="border-manga-black bg-manga-white grid size-5 shrink-0 place-items-center border-2"
        >
          {selected && <span className="bg-manga-red size-2.5" />}
        </span>
      )}
      <DictationVideoThumbnail
        title={video.title}
        thumbnailUrl={video.thumbnailUrl}
        youtubeVideoId={video.youtubeVideoId}
        sizes="96px"
        className="w-20 shrink-0 sm:w-24"
      />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-black">
        {video.title}
      </span>
      <AdminVideoLevelBadge
        videoId={video.id}
        level={video.level}
      />
      {meta}
      {video.status && (
        <PageTag
          tone={getDictationStatusTone(video.status)}
          className="shrink-0"
        >
          {getDictationStatusLabel(video.status)}
        </PageTag>
      )}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Link
          href={`/admin/videos/${video.id}/edit`}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          className="border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-9 shrink-0 items-center gap-1 border-2 px-3 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)]"
        >
          <Pencil
            aria-hidden="true"
            className="size-3"
          />{' '}
          Edit
        </Link>
        {actions}
      </div>
    </li>
  )
}
