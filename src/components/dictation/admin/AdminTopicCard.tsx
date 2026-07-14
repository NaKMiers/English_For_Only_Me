'use client'

import { ChevronDown, EllipsisVertical, Pencil, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import {
  createSectionAction,
  deleteSectionAction,
  deleteTopicAction,
  moveVideoAction,
  removeVideoFromSectionAction,
  reorderSectionsAction,
  reorderVideosAction,
  updateSectionAction,
  updateTopicAction,
} from '@/modules/dictation/content/adminActions'

import { ConfirmSubmitButton } from './ConfirmSubmitButton'
import { AdminTopicThumbnailFields } from './AdminTopicThumbnailFields'
import { AdminVideoRow } from './AdminVideoRow'
import {
  DropZone,
  MIME_SECTION,
  MIME_TOPIC,
  MIME_VIDEO,
  MIME_VIDEO_SECTION,
  ReorderHandle,
  reorderIds,
  type AdminSectionVideo,
} from './adminVideoDnd'

export type { AdminSectionVideo }

export interface AdminSectionData {
  id: string
  title: string
  videos: AdminSectionVideo[]
}

export interface AdminTopicData {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  order: number
  hasVideoMedia: boolean
  videoCount: number
  sections: AdminSectionData[]
  ungrouped: AdminSectionVideo[]
}

const input =
  'border-manga-black min-h-11 rounded-none border-3 bg-manga-white px-3 py-2 font-sans text-base font-black'
const menuButton =
  'flex min-h-11 w-full items-center gap-2 px-3 font-sans text-sm font-black whitespace-nowrap transition-colors'
const menuDangerButton = `${menuButton} text-manga-red hover:bg-manga-red hover:text-manga-white focus:bg-manga-red focus:text-manga-white`

function AdminCardActionsMenu({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        title="Actions"
        className="border-manga-black bg-manga-white hover:bg-manga-paper-soft grid size-9 shrink-0 place-items-center border-2 shadow-[2px_2px_0_var(--manga-black)] transition-colors"
      >
        <EllipsisVertical
          aria-hidden="true"
          className="size-4"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Merge fresh server sections with the local (optimistically reordered) copy.
 * Keeps the local video order for any section whose set of video ids matches the
 * server's (a pure reorder we already applied), and takes the server version for
 * sections whose membership changed. Uses the server's video objects either way
 * so other fields stay fresh.
 */
export function reconcileSections(
  local: AdminSectionData[],
  server: AdminSectionData[]
): AdminSectionData[] {
  const localById = new Map(local.map(section => [section.id, section]))

  return server.map(serverSection => {
    const localSection = localById.get(serverSection.id)
    if (!localSection) return serverSection

    const localOrder = localSection.videos.map(video => video.id)
    const serverIds = new Set(serverSection.videos.map(video => video.id))
    const sameSet =
      localOrder.length === serverSection.videos.length &&
      localOrder.every(id => serverIds.has(id))
    if (!sameSet) return serverSection

    const byId = new Map(serverSection.videos.map(video => [video.id, video]))
    return {
      ...serverSection,
      videos: localOrder.flatMap(id => {
        const video = byId.get(id)
        return video ? [video] : []
      }),
    }
  })
}

function SectionBlock({
  section,
  onDropVideo,
  onReorder,
  onReorderVideo,
  onReorderVideoToEnd,
}: {
  section: AdminSectionData
  onDropVideo: (videoId: string, sectionId: string) => void
  onReorder: (draggedId: string, beforeId: string) => void
  onReorderVideo: (
    section: AdminSectionData,
    draggedId: string,
    targetId: string,
    placement: 'before' | 'after'
  ) => boolean
  onReorderVideoToEnd: (
    section: AdminSectionData,
    draggedId: string,
    sourceSectionId: string
  ) => boolean
}) {
  const [open, setOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  return (
    <DropZone
      accept={MIME_SECTION}
      onDrop={draggedId => onReorder(draggedId, section.id)}
      className="min-w-0"
    >
      <DropZone
        accept={MIME_VIDEO}
        onDrop={videoId => onDropVideo(videoId, section.id)}
        onEnter={() => setOpen(true)}
        className="border-manga-black bg-manga-paper-soft min-w-0 border-2"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ReorderHandle
              mime={MIME_SECTION}
              id={section.id}
              label={`Reorder ${section.title}`}
            />
            {editingTitle ? (
              <form
                action={async formData => {
                  const result = await updateSectionAction(formData)
                  if (!result?.ok) return

                  setEditingTitle(false)
                }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <input
                  type="hidden"
                  name="id"
                  value={section.id}
                />
                <Input
                  name="title"
                  defaultValue={section.title}
                  required
                  autoFocus
                  className={`${input} min-h-9 flex-1 py-1 text-sm`}
                />
                <MangaButton
                  type="submit"
                  tone="primary"
                  className="min-h-9 border-2 px-3 text-xs uppercase shadow-none"
                >
                  Save
                </MangaButton>
                <MangaButton
                  type="button"
                  tone="paper"
                  onClick={() => setEditingTitle(false)}
                  className="min-h-9 border-2 px-3 text-xs uppercase shadow-none"
                >
                  Cancel
                </MangaButton>
              </form>
            ) : (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 transition-transform',
                    open && 'rotate-180'
                  )}
                />
                <span className="truncate font-sans text-sm font-black">
                  {section.title}
                </span>
                <PageTag tone="pale">{section.videos.length}</PageTag>
              </button>
            )}
          </div>
          {!editingTitle && (
            <AdminCardActionsMenu label={`Actions for ${section.title}`}>
              <DropdownMenuItem
                onClick={() => {
                  setEditingTitle(true)
                  setOpen(true)
                }}
              >
                <Pencil aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={deleteSectionAction}>
                <input
                  type="hidden"
                  name="id"
                  value={section.id}
                />
                <ConfirmSubmitButton
                  confirmTitle="Remove section?"
                  confirmMessage={`Remove "${section.title}"? This does not delete any video.`}
                  confirmLabel="Remove section"
                  disabled={section.videos.length > 0}
                  disabledReason="Move or remove its videos first - a section with videos can't be removed."
                  className={menuDangerButton}
                >
                  <X
                    aria-hidden="true"
                    className="size-4"
                  />
                  Remove
                </ConfirmSubmitButton>
              </form>
            </AdminCardActionsMenu>
          )}
        </div>
        {open && (
          <ul
            onDragOver={event => {
              if (!event.dataTransfer.types.includes(MIME_VIDEO)) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={event => {
              if (!event.dataTransfer.types.includes(MIME_VIDEO)) return

              const draggedId = event.dataTransfer.getData(MIME_VIDEO)
              const sourceSectionId =
                event.dataTransfer.getData(MIME_VIDEO_SECTION)
              const handled =
                draggedId && sourceSectionId
                  ? onReorderVideoToEnd(section, draggedId, sourceSectionId)
                  : false

              if (!handled) return
              event.preventDefault()
              event.stopPropagation()
            }}
            className="border-manga-black grid gap-2 border-t-2 p-2"
          >
            {section.videos.length === 0 ? (
              <li className="text-manga-ink-soft p-2 text-sm">
                No videos yet - drag one here.
              </li>
            ) : (
              section.videos.map(video => (
                <AdminVideoRow
                  key={video.id}
                  video={video}
                  gripLabel={`Reorder ${video.title}`}
                  acceptReorderMime={MIME_VIDEO}
                  onDragStartData={dataTransfer => {
                    dataTransfer.setData(MIME_VIDEO, video.id)
                    dataTransfer.setData(MIME_VIDEO_SECTION, section.id)
                  }}
                  onReorder={(draggedId, targetId, placement) =>
                    onReorderVideo(section, draggedId, targetId, placement)
                  }
                  menuActions={
                    <form
                      action={removeVideoFromSectionAction}
                      className="shrink-0"
                    >
                      <input
                        type="hidden"
                        name="videoId"
                        value={video.id}
                      />
                      <DropdownMenuItem
                        render={<button type="submit" />}
                        nativeButton
                        variant="destructive"
                        className="w-full"
                      >
                        <X aria-hidden="true" />
                        Remove
                      </DropdownMenuItem>
                    </form>
                  }
                />
              ))
            )}
          </ul>
        )}
      </DropZone>
    </DropZone>
  )
}

export function AdminTopicCard({ topic }: { topic: AdminTopicData }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [, startTransition] = useTransition()

  // Local copy of the sections so a within-section reorder shows instantly,
  // instead of waiting for the server round-trip + refresh (which is what made
  // drag-to-reorder feel like it did nothing). When fresh server data arrives we
  // reconcile it during render (the React-recommended alternative to a
  // prop-syncing effect): a section whose video *set* is unchanged keeps the
  // order the user just dragged - otherwise the post-refresh render would snap
  // it back to the server's ordering and undo the drag. A section whose set
  // changed (a move/add/remove) adopts the server version wholesale.
  const [sections, setSections] = useState(topic.sections)
  const [serverSections, setServerSections] = useState(topic.sections)
  if (serverSections !== topic.sections) {
    setServerSections(topic.sections)
    setSections(prev => reconcileSections(prev, topic.sections))
  }

  function moveVideo(videoId: string, sectionId: string | null) {
    startTransition(async () => {
      await moveVideoAction({ videoId, topicId: topic.id, sectionId })
      router.refresh()
    })
  }

  // Persist a section's new video order, updating the UI optimistically first.
  function applySectionOrder(sectionId: string, orderedIds: string[]) {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) return section
        const byId = new Map(section.videos.map(video => [video.id, video]))
        const videos = orderedIds.flatMap(id => {
          const video = byId.get(id)
          return video ? [video] : []
        })
        return { ...section, videos }
      })
    )
    startTransition(async () => {
      await reorderVideosAction(orderedIds)
      router.refresh()
    })
  }

  function reorderSection(draggedId: string, beforeId: string) {
    if (draggedId === beforeId) return
    const next = reorderIds(
      topic.sections.map(s => s.id),
      draggedId,
      beforeId
    )
    startTransition(async () => {
      await reorderSectionsAction(next)
      router.refresh()
    })
  }

  function reorderSectionVideo(
    section: AdminSectionData,
    draggedId: string,
    targetId: string,
    placement: 'before' | 'after'
  ) {
    if (draggedId === targetId) return false

    const current = section.videos.map(video => video.id)
    if (!current.includes(draggedId)) return false

    const without = current.filter(id => id !== draggedId)
    const targetIndex = without.indexOf(targetId)
    if (targetIndex === -1) return false

    const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex
    const next = [...without]
    next.splice(insertIndex, 0, draggedId)

    applySectionOrder(section.id, next)
    return true
  }

  function reorderSectionVideoToEnd(
    section: AdminSectionData,
    draggedId: string,
    sourceSectionId: string
  ) {
    if (sourceSectionId !== section.id) return false

    const current = section.videos.map(video => video.id)
    if (!current.includes(draggedId)) return false
    if (current.at(-1) === draggedId) return true

    const next = [...current.filter(id => id !== draggedId), draggedId]

    applySectionOrder(section.id, next)
    return true
  }

  return (
    <div
      // Auto-expand a collapsed topic when a VIDEO is dragged over it (so its
      // sections become droppable). Ignore topic-reorder drags.
      onDragOver={event => {
        if (!expanded && event.dataTransfer.types.includes(MIME_VIDEO))
          setExpanded(true)
      }}
      className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <ReorderHandle
            mime={MIME_TOPIC}
            id={topic.id}
            label={`Reorder ${topic.title}`}
          />
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse topic' : 'Expand topic'}
            onClick={() => setExpanded(v => !v)}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2 self-stretch text-left"
          >
            <span className="border-manga-black bg-manga-white grid size-8 shrink-0 place-items-center border-2">
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'size-4 transition-transform',
                  expanded && 'rotate-180'
                )}
              />
            </span>
            <span className="text-manga-red font-sans text-lg font-black">
              {topic.title}
            </span>
            {topic.hasVideoMedia && <PageTag tone="yellow">Video</PageTag>}
            <PageTag tone="pale">{topic.videoCount} videos</PageTag>
            <span className="text-manga-ink-soft text-xs">/{topic.slug}</span>
          </button>
        </div>
        <AdminCardActionsMenu label={`Actions for ${topic.title}`}>
          <DropdownMenuItem onClick={() => setEditing(v => !v)}>
            {editing ? <X aria-hidden="true" /> : <Pencil aria-hidden="true" />}
            {editing ? 'Close' : 'Edit'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={deleteTopicAction}>
            <input
              type="hidden"
              name="id"
              value={topic.id}
            />
            <ConfirmSubmitButton
              confirmTitle="Delete topic?"
              confirmMessage={`Delete "${topic.title}"? Its (empty) sections are removed along with it.`}
              confirmLabel="Delete topic"
              disabled={topic.videoCount > 0}
              disabledReason="Move or remove its videos first - a topic with videos can't be deleted."
              className={menuDangerButton}
            >
              <Trash2
                aria-hidden="true"
                className="size-4"
              />
              Delete
            </ConfirmSubmitButton>
          </form>
        </AdminCardActionsMenu>
      </div>

      {editing && (
        <form
          action={async formData => {
            const result = await updateTopicAction(formData)
            if (!result?.ok) return

            setEditing(false)
          }}
          encType="multipart/form-data"
          className="border-manga-black bg-manga-paper-soft grid gap-3 border-2 p-3"
        >
          <input
            type="hidden"
            name="id"
            value={topic.id}
          />
          <div className="grid gap-3 md:grid-cols-[auto_1fr]">
            <AdminTopicThumbnailFields
              defaultUrl={topic.thumbnailUrl}
              title={topic.title}
            />
            <div className="grid gap-3">
              <Label className="grid gap-1 font-sans text-sm font-black">
                Title
                <Input
                  name="title"
                  defaultValue={topic.title}
                  required
                  className={input}
                />
              </Label>
              <Label className="grid gap-1 font-sans text-sm font-black">
                Description
                <Input
                  name="description"
                  defaultValue={topic.description ?? ''}
                  className={input}
                />
              </Label>
            </div>
          </div>
          <p className="text-manga-ink-soft text-xs">
            Renaming updates the topic&apos;s URL (/dictation/{topic.slug}).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Label className="font-sans text-sm font-black">
              <Checkbox
                name="hasVideoMedia"
                value="on"
                defaultChecked={topic.hasVideoMedia}
              />
              Video badge
            </Label>
            <MangaButton
              type="submit"
              tone="primary"
            >
              Save changes
            </MangaButton>
          </div>
        </form>
      )}

      {expanded && (
        <>
          <p className="text-manga-ink-soft text-xs">
            Drag the ⠿ handles to reorder sections; drag a video into a section
            or another topic to move it.
          </p>

          <div className="grid gap-2">
            {sections.map(section => (
              <SectionBlock
                key={section.id}
                section={section}
                onDropVideo={moveVideo}
                onReorder={reorderSection}
                onReorderVideo={reorderSectionVideo}
                onReorderVideoToEnd={reorderSectionVideoToEnd}
              />
            ))}

            {topic.ungrouped.length > 0 && (
              <DropZone
                accept={MIME_VIDEO}
                onDrop={videoId => moveVideo(videoId, null)}
                className="border-manga-black bg-manga-paper-soft border-2 p-2"
              >
                <p className="mb-2 font-sans text-sm font-black">
                  Ungrouped in this topic ({topic.ungrouped.length})
                </p>
                <ul className="grid gap-2">
                  {topic.ungrouped.map(video => (
                    <AdminVideoRow
                      key={video.id}
                      video={video}
                      gripLabel={`Drag ${video.title}`}
                      acceptReorderMime={MIME_VIDEO}
                      onDragStartData={dataTransfer =>
                        dataTransfer.setData(MIME_VIDEO, video.id)
                      }
                    />
                  ))}
                </ul>
              </DropZone>
            )}

            <form
              action={createSectionAction}
              className="flex flex-wrap gap-2"
            >
              <input
                type="hidden"
                name="topicId"
                value={topic.id}
              />
              <Input
                name="title"
                placeholder="New section title"
                required
                className={`${input} flex-1`}
              />
              <MangaButton
                type="submit"
                tone="primary"
              >
                Add section
              </MangaButton>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
