'use client'

import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { DragEvent, ReactNode } from 'react'
import { useTransition } from 'react'

import { AdminMenuTrigger } from '@/components/admin/AdminMenuTrigger'
import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PageTag } from '@/components/ui/PageTag'
import { format } from '@/i18n/format'
import { useMessages } from '@/i18n/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  deleteVideoAction,
  updateVideoLevelAction,
} from '@/modules/dictation/content/adminActions'
import {
  DICTATION_LEVELS,
  type DictationLevel,
} from '@/modules/dictation/levels'
import { getDictationStatusTone } from '@/modules/dictation/statusDisplay'
import type { DictationVideoStatus } from '@/modules/dictation/types'

import { ConfirmSubmitButton } from './ConfirmSubmitButton'

/** Click-to-edit level badge; changes persist immediately, without touching topic/section. */
function AdminVideoLevelBadge({
  videoId,
  level,
}: {
  videoId: string
  level: string | null
}) {
  const t = useMessages()
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
            'rounded-tag min-h-6 gap-1 border px-2 py-0 text-xs font-semibold shadow-none',
            level
              ? 'bg-pastel-sky text-accent-blue'
              : 'bg-surface text-ink-soft'
          )}
        >
          <SelectValue placeholder={t.admin.videoRow.noLevel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{t.admin.videoRow.noLevel}</SelectItem>
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

function AdminVideoActionsMenu({
  video,
  children,
}: {
  video: AdminVideoItem
  children?: ReactNode
}) {
  const t = useMessages()

  return (
    <DropdownMenu>
      <AdminMenuTrigger
        label={format(t.admin.menu.triggerFor, { title: video.title })}
        title={t.admin.menu.trigger}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
      />
      <DropdownMenuContent
        align="end"
        onClick={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
        className="w-44"
      >
        <DropdownMenuItem
          render={<Link href={`/admin/dictation/videos/${video.id}/edit`} />}
        >
          <Pencil aria-hidden="true" />
          {t.common.actions.edit}
        </DropdownMenuItem>
        {children}
        <DropdownMenuSeparator />
        {/* Soft delete: archives the video into the trash panel, where it can
            be restored or deleted for good. */}
        <form
          action={deleteVideoAction}
          className="shrink-0"
        >
          <input
            type="hidden"
            name="id"
            value={video.id}
          />
          <ConfirmSubmitButton
            confirmTitle={t.admin.videoRow.deleteTitle}
            confirmMessage={format(t.admin.videoRow.deleteMessage, {
              title: video.title,
            })}
            confirmLabel={t.admin.videoRow.deleteConfirm}
            className="focus:bg-brand focus:text-surface text-brand hover:bg-brand hover:text-surface rounded-tag flex min-h-11 w-full items-center gap-2 px-3 font-sans text-sm font-semibold whitespace-nowrap transition-colors"
          >
            <Trash2
              aria-hidden="true"
              className="size-4"
            />
            {t.common.actions.delete}
          </ConfirmSubmitButton>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
 * and a trailing actions menu. Both views of /admin/dictation render this
 * so the two surfaces stay visually identical.
 *
 * Drag model: the row and its grip both start a drag by writing
 * `onDragStartData` to the dataTransfer. Dropping another row that carries
 * `acceptReorderMime` onto this row calls `onReorder` - returning true marks
 * the drop handled and stops it bubbling to any enclosing drop zone.
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
  menuActions,
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
  menuActions?: ReactNode
}) {
  const t = useMessages()

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
        'border-line bg-surface rounded-control flex min-w-0 cursor-grab flex-wrap items-center gap-2 border p-2 active:cursor-grabbing',
        selectable && 'hover:bg-tint'
      )}
    >
      <button
        type="button"
        draggable
        aria-label={gripLabel}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
        onDragStart={startDrag}
        className="border-line bg-surface rounded-tag grid size-8 shrink-0 cursor-grab place-items-center border active:cursor-grabbing"
      >
        <GripVertical
          aria-hidden="true"
          className="text-ink-soft size-4"
        />
      </button>
      {selectable && (
        <span
          aria-hidden="true"
          className="border-line bg-surface rounded-tag grid size-5 shrink-0 place-items-center border"
        >
          {selected && <span className="bg-brand size-2.5" />}
        </span>
      )}
      <DictationVideoThumbnail
        title={video.title}
        thumbnailUrl={video.thumbnailUrl}
        youtubeVideoId={video.youtubeVideoId}
        sizes="96px"
        className="rounded-tag w-20 shrink-0 sm:w-24"
      />
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-semibold">
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
          {t.admin.status[video.status]}
        </PageTag>
      )}
      <div className="flex shrink-0 items-center">
        <AdminVideoActionsMenu video={video}>
          {menuActions}
        </AdminVideoActionsMenu>
      </div>
    </li>
  )
}
