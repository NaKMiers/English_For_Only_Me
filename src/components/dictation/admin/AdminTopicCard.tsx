'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import {
  createSectionAction,
  deleteSectionAction,
  deleteTopicAction,
  moveVideoAction,
  reorderSectionsAction,
  updateTopicAction,
} from '@/modules/dictation/content/adminActions'

import { ConfirmSubmitButton } from './ConfirmSubmitButton'
import {
  DraggableVideoRow,
  DropZone,
  MIME_SECTION,
  MIME_TOPIC,
  MIME_VIDEO,
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
  order: number
  hasVideoMedia: boolean
  videoCount: number
  sections: AdminSectionData[]
  ungrouped: AdminSectionVideo[]
}

const input =
  'border-manga-black border-3 bg-manga-white px-3 py-2 font-sans text-base font-black'
const btn =
  'border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-11 items-center border-3 px-4 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]'
const danger =
  'border-manga-black bg-manga-white hover:bg-manga-pale-red inline-flex min-h-11 items-center border-3 px-3 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]'

function SectionBlock({
  section,
  onDropVideo,
  onReorder,
}: {
  section: AdminSectionData
  onDropVideo: (videoId: string, sectionId: string) => void
  onReorder: (draggedId: string, beforeId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <DropZone
      accept={MIME_SECTION}
      onDrop={draggedId => onReorder(draggedId, section.id)}
    >
      <DropZone
        accept={MIME_VIDEO}
        onDrop={videoId => onDropVideo(videoId, section.id)}
        onEnter={() => setOpen(true)}
        className="border-manga-black bg-manga-paper-soft border-2"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ReorderHandle
              mime={MIME_SECTION}
              id={section.id}
              label={`Reorder ${section.title}`}
            />
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
          </div>
          <form action={deleteSectionAction}>
            <input
              type="hidden"
              name="id"
              value={section.id}
            />
            <ConfirmSubmitButton
              confirmTitle="Remove section?"
              confirmMessage={`Remove "${section.title}"? Its videos stay but become ungrouped. This does not delete any video.`}
              confirmLabel="Remove section"
              className="border-manga-black bg-manga-white hover:bg-manga-pale-red inline-flex min-h-9 items-center border-2 px-3 font-sans text-xs font-black uppercase"
            >
              Remove
            </ConfirmSubmitButton>
          </form>
        </div>
        {open && (
          <ul className="border-manga-black grid gap-2 border-t-2 p-2">
            {section.videos.length === 0 ? (
              <li className="text-manga-ink-soft p-2 text-sm">
                No videos yet — drag one here.
              </li>
            ) : (
              section.videos.map(video => (
                <DraggableVideoRow
                  key={video.id}
                  video={video}
                  sectioned
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

  function moveVideo(videoId: string, sectionId: string | null) {
    startTransition(async () => {
      await moveVideoAction({ videoId, topicId: topic.id, sectionId })
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

  return (
    <div
      // Auto-expand a collapsed topic when a VIDEO is dragged over it (so its
      // sections become droppable). Ignore topic-reorder drags.
      onDragOver={event => {
        if (!expanded && event.dataTransfer.types.includes(MIME_VIDEO))
          setExpanded(true)
      }}
      className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            className="border-manga-black bg-manga-white grid size-8 shrink-0 place-items-center border-2"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 transition-transform',
                expanded && 'rotate-180'
              )}
            />
          </button>
          <Link
            href={`/dictation/${topic.slug}`}
            className="text-manga-red font-sans text-lg font-black hover:underline"
          >
            {topic.title}
          </Link>
          {topic.hasVideoMedia && <PageTag tone="yellow">Video</PageTag>}
          <PageTag tone="pale">{topic.videoCount} videos</PageTag>
          <span className="text-manga-ink-soft text-xs">/{topic.slug}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(v => !v)}
            className={btn}
          >
            {editing ? 'Close' : 'Edit'}
          </button>
          <form action={deleteTopicAction}>
            <input
              type="hidden"
              name="id"
              value={topic.id}
            />
            <ConfirmSubmitButton
              confirmTitle="Delete topic?"
              confirmMessage={`Delete "${topic.title}"? Its sections are removed and its videos become uncategorized. No video is deleted.`}
              confirmLabel="Delete topic"
              className={danger}
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      {editing && (
        <form
          action={updateTopicAction}
          className="border-manga-black bg-manga-paper-soft grid gap-3 border-2 p-3"
        >
          <input
            type="hidden"
            name="id"
            value={topic.id}
          />
          <label className="grid gap-1 font-sans text-sm font-black">
            Title
            <input
              name="title"
              defaultValue={topic.title}
              required
              className={input}
            />
          </label>
          <label className="grid gap-1 font-sans text-sm font-black">
            Description
            <input
              name="description"
              defaultValue={topic.description ?? ''}
              className={input}
            />
          </label>
          <p className="text-manga-ink-soft text-xs">
            Renaming updates the topic&apos;s URL (/dictation/{topic.slug}).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 font-sans text-sm font-black">
              <input
                type="checkbox"
                name="hasVideoMedia"
                defaultChecked={topic.hasVideoMedia}
                className="size-5"
              />
              Video badge
            </label>
            <button
              type="submit"
              className={btn}
            >
              Save changes
            </button>
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
            {topic.sections.map(section => (
              <SectionBlock
                key={section.id}
                section={section}
                onDropVideo={moveVideo}
                onReorder={reorderSection}
              />
            ))}

            <DropZone
              accept={MIME_VIDEO}
              onDrop={videoId => moveVideo(videoId, null)}
              className="border-manga-black bg-manga-paper-soft border-2 p-2"
            >
              <p className="mb-2 font-sans text-sm font-black">
                Ungrouped in this topic ({topic.ungrouped.length})
              </p>
              {topic.ungrouped.length === 0 ? (
                <p className="text-manga-ink-soft text-sm">
                  Drop a video here to remove it from its section.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {topic.ungrouped.map(video => (
                    <DraggableVideoRow
                      key={video.id}
                      video={video}
                      sectioned={false}
                    />
                  ))}
                </ul>
              )}
            </DropZone>

            <form
              action={createSectionAction}
              className="flex flex-wrap gap-2"
            >
              <input
                type="hidden"
                name="topicId"
                value={topic.id}
              />
              <input
                name="title"
                placeholder="New section title"
                required
                className={`${input} flex-1`}
              />
              <button
                type="submit"
                className={btn}
              >
                Add section
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
