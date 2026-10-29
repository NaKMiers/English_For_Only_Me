import { ChevronDown } from 'lucide-react'

import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'

import { AdminTrashVideoMenu } from './AdminTrashVideoMenu'

export interface AdminTrashVideo {
  id: string
  /** Where the video goes back to on restore, e.g. "Travel · Airports". */
  placement: string | null
  thumbnailUrl: string | null
  title: string
  youtubeVideoId: string | null
}

/**
 * Soft-deleted videos, shown under both views of /admin/dictation. Restore puts
 * a video back in its old topic and section (archiving never clears them);
 * Delete permanently removes it with its transcripts and practice data.
 */
export function AdminTrashPanel({ videos }: { videos: AdminTrashVideo[] }) {
  if (videos.length === 0) return null

  return (
    <details className="group border-manga-black bg-manga-white rounded-panel border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden="true"
          className="size-5 transition-transform group-open:rotate-180"
        />
        <span className="font-sans text-base font-black uppercase">
          Deleted videos
        </span>
        <PageTag tone="pale">{videos.length}</PageTag>
      </summary>

      <p className="text-manga-ink-soft mt-3 text-xs">
        Use a video&apos;s ⋯ menu to restore it where it was, or to delete it
        permanently with its transcripts and practice history.
      </p>

      <ul className="mt-3 grid gap-2">
        {videos.map(video => (
          <li
            key={video.id}
            className="border-manga-black bg-manga-paper-soft rounded-control flex min-w-0 items-center gap-3 border-2 p-2"
          >
            <DictationVideoThumbnail
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              youtubeVideoId={video.youtubeVideoId}
              sizes="96px"
              className="rounded-tag w-20 shrink-0 opacity-70 grayscale sm:w-24"
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="truncate font-sans text-sm font-black">
                {video.title}
              </span>
              <span className="text-manga-ink-soft truncate text-xs font-semibold">
                {video.placement ?? 'No topic'}
              </span>
            </span>
            <AdminTrashVideoMenu
              id={video.id}
              title={video.title}
            />
          </li>
        ))}
      </ul>
    </details>
  )
}
