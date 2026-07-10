'use client'

import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import { moveVideoAction } from '@/modules/dictation/content/adminActions'

import {
  DraggableVideoRow,
  DropZone,
  type AdminSectionVideo,
} from './adminVideoDnd'

/**
 * Page-level pool of videos with no topic. A persistent drag SOURCE (drag a
 * video into any topic's section below to organize it) and a drop TARGET (drop a
 * video here to unassign it from its topic/section entirely).
 */
export function AdminUnassignedPanel({
  videos,
}: {
  videos: AdminSectionVideo[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [, startTransition] = useTransition()

  function unassign(videoId: string) {
    startTransition(async () => {
      await moveVideoAction({ videoId, topicId: null, sectionId: null })
      router.refresh()
    })
  }

  return (
    <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-left"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn('size-5 transition-transform', open && 'rotate-180')}
        />
        <span className="font-sans text-base font-black uppercase">
          Unassigned videos
        </span>
        <PageTag tone="pale">{videos.length}</PageTag>
      </button>

      {open && (
        <DropZone
          onDropVideo={unassign}
          onEnter={() => setOpen(true)}
          className="grid gap-2"
        >
          <p className="text-manga-ink-soft text-xs">
            Drag a video into a topic&apos;s section below to organize it. Drop
            a video here to unassign it.
          </p>
          {videos.length === 0 ? (
            <p className="text-manga-ink-soft border-manga-black bg-manga-paper-soft border-2 p-3 text-sm">
              Everything is assigned to a topic.
            </p>
          ) : (
            <ul className="grid gap-2">
              {videos.map(video => (
                <DraggableVideoRow
                  key={video.id}
                  video={video}
                  sectioned={false}
                />
              ))}
            </ul>
          )}
        </DropZone>
      )}
    </div>
  )
}
