import { Check } from 'lucide-react'
import Link from 'next/link'

import { CompletionBadge } from '@/components/dictation/CompletionBadge'
import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'

import { FavoriteButton } from './FavoriteButton'

// No directive on purpose: server pages render these cards directly (only the
// FavoriteButton hydrates), and BrowseVideoListClient renders the same markup
// in the browser for lists that start closed. Keep it client-safe: no
// server-only imports. Above-the-fold cards get a high fetch priority.
const PRIORITY_CARD_COUNT = 4

export interface BrowseVideoItem {
  id: string
  title: string
  level: string | null
  practiceHref: string | null
  favorited: boolean
  completions: number
  inProgress: boolean
  thumbnailUrl: string | null
  youtubeVideoId: string | null
}

function VideoCard({
  video,
  canFavorite,
  priority,
}: {
  video: BrowseVideoItem
  canFavorite: boolean
  priority: boolean
}) {
  return (
    <li
      className={cn(
        'border-manga-black bg-manga-white rounded-panel relative grid min-w-0 gap-2 border-2 p-2',
        video.practiceHref &&
          'hover:bg-manga-paper-soft focus-within:bg-manga-paper-soft cursor-pointer'
      )}
    >
      {video.practiceHref && (
        <Link
          href={video.practiceHref}
          aria-label={`Practice ${video.title}`}
          className="absolute inset-0 z-0"
        />
      )}
      <div className="pointer-events-none relative">
        <DictationVideoThumbnail
          title={video.title}
          thumbnailUrl={video.thumbnailUrl}
          youtubeVideoId={video.youtubeVideoId}
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="w-full"
        />
        <span className="pointer-events-auto absolute top-1 right-1 z-10">
          <FavoriteButton
            videoId={video.id}
            initialFavorited={video.favorited}
            canFavorite={canFavorite}
          />
        </span>
      </div>
      <div className="pointer-events-none flex min-w-0 flex-wrap items-center gap-1.5">
        {video.completions > 0 && (
          <Check
            aria-label="Completed"
            className="text-manga-red size-4 shrink-0"
          />
        )}
        {video.level && <PageTag tone="sky">{video.level}</PageTag>}
        <CompletionBadge completions={video.completions} />
      </div>
      <span className="pointer-events-none line-clamp-2 min-w-0 font-sans text-base leading-tight font-black">
        {video.title}
      </span>
      <div className="pointer-events-none relative z-10">
        {video.practiceHref ? (
          <span
            aria-hidden="true"
            className={cn(
              'border-manga-black hover:bg-manga-pale-red rounded-control inline-flex min-h-9 w-full items-center justify-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]',
              video.inProgress
                ? 'bg-cyan-200'
                : video.completions > 0
                  ? 'bg-manga-yellow'
                  : 'bg-manga-paper-soft'
            )}
          >
            {video.inProgress
              ? 'Continue'
              : video.completions > 0
                ? 'Practice again'
                : 'Practice'}
          </span>
        ) : (
          <span className="text-manga-ink-soft text-xs font-black uppercase">
            No transcript
          </span>
        )}
      </div>
    </li>
  )
}

export function BrowseVideoList({
  videos,
  canFavorite,
  id,
  emptyLabel = 'No lessons here yet.',
  className,
  priorityCount = PRIORITY_CARD_COUNT,
}: {
  videos: BrowseVideoItem[]
  canFavorite: boolean
  id?: string
  emptyLabel?: string
  className?: string
  /** Leading cards loaded eagerly; 0 for lists opened after load. */
  priorityCount?: number
}) {
  if (videos.length === 0)
    return (
      <p
        id={id}
        className={cn('text-manga-ink-soft p-2 text-sm', className)}
      >
        {emptyLabel}
      </p>
    )

  return (
    <ul
      id={id}
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          canFavorite={canFavorite}
          priority={index < priorityCount}
        />
      ))}
    </ul>
  )
}
