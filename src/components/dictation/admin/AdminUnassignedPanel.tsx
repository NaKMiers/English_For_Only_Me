'use client'

import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import { moveVideoAction } from '@/modules/dictation/content/adminActions'

import { AdminVideoRow } from './AdminVideoRow'
import { DropZone, MIME_VIDEO, type AdminSectionVideo } from './adminVideoDnd'

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

  if (videos.length === 0) return null

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
          accept={MIME_VIDEO}
          onDrop={unassign}
          onEnter={() => setOpen(true)}
          className="grid gap-2"
        >
          <p className="text-manga-ink-soft text-xs">
            Drag a video into a topic&apos;s section below to organize it. Drop
            a video here to unassign it.
          </p>
          <ul className="grid gap-2">
            {videos.map(video => (
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
    </div>
  )
}
