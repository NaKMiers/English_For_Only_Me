'use client'

import { ChevronDown, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import {
  createSectionAction,
  deleteSectionAction,
  deleteTopicAction,
  removeVideoFromSectionAction,
  updateTopicAction,
} from '@/modules/dictation/content/adminActions'

import { ConfirmSubmitButton } from './ConfirmSubmitButton'

export interface AdminSectionVideo {
  id: string
  title: string
  level: string | null
  thumbnailUrl: string | null
  youtubeVideoId: string | null
}

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

function VideoRow({
  video,
  sectioned,
}: {
  video: AdminSectionVideo
  sectioned: boolean
}) {
  return (
    <li className="border-manga-black bg-manga-white flex items-center gap-3 border-2 p-2">
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

function SectionBlock({ section }: { section: AdminSectionData }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-manga-black bg-manga-paper-soft border-2">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
          <span className="truncate font-sans text-sm font-black">
            {section.title}
          </span>
          <PageTag tone="pale">{section.videos.length}</PageTag>
        </button>
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
              No videos in this section.
            </li>
          ) : (
            section.videos.map(video => (
              <VideoRow
                key={video.id}
                video={video}
                sectioned
              />
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export function AdminTopicCard({ topic }: { topic: AdminTopicData }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap items-center gap-4">
            <label className="grid gap-1 font-sans text-sm font-black">
              Order
              <input
                name="order"
                type="number"
                defaultValue={topic.order}
                className={`${input} w-28`}
              />
            </label>
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

      <div className="grid gap-2">
        {topic.sections.map(section => (
          <SectionBlock
            key={section.id}
            section={section}
          />
        ))}

        {topic.ungrouped.length > 0 && (
          <div className="border-manga-black bg-manga-paper-soft border-2 p-2">
            <p className="mb-2 font-sans text-sm font-black">
              Ungrouped in this topic ({topic.ungrouped.length})
            </p>
            <ul className="grid gap-2">
              {topic.ungrouped.map(video => (
                <VideoRow
                  key={video.id}
                  video={video}
                  sectioned={false}
                />
              ))}
            </ul>
          </div>
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
    </div>
  )
}
