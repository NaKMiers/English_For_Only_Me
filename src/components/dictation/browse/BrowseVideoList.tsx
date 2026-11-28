import { Check } from 'lucide-react'
import Link from 'next/link'

import { CompletionBadge } from '@/components/dictation/CompletionBadge'
import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { PageTag } from '@/components/ui/PageTag'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'

import { FavoriteButton } from './FavoriteButton'

// No directive on purpose: server pages render these cards directly (only the
// FavoriteButton hydrates), and BrowseVideoListClient renders the same markup
// in the browser for lists that start closed. Keep it client-safe: no
// server-only imports. Above-the-fold cards get a high fetch priority.
// For the same reason the card text arrives as `labels` (from the page's
// `getMessages()`) instead of a hook.
const PRIORITY_CARD_COUNT = 4

export type BrowseCardLabels = Messages['dictation']['browse']['card']

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
  labels,
  priority,
  className,
}: {
  video: BrowseVideoItem
  canFavorite: boolean
  labels: BrowseCardLabels
  priority: boolean
  className?: string
}) {
  return (
    <li
      className={cn(
        'border-line bg-surface rounded-panel relative grid min-w-0 content-start gap-1.5 border p-1.5',
        video.practiceHref &&
          'hover:bg-tint-soft focus-within:bg-tint-soft hover-pop cursor-pointer',
        className
      )}
    >
      {video.practiceHref && (
        <Link
          href={video.practiceHref}
          aria-label={format(labels.practiceVideo, { title: video.title })}
          className="absolute inset-0 z-0"
        />
      )}
      <div className="pointer-events-none relative">
        <DictationVideoThumbnail
          title={video.title}
          thumbnailUrl={video.thumbnailUrl}
          youtubeVideoId={video.youtubeVideoId}
          sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
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
      <span className="pointer-events-none line-clamp-2 min-h-[2.5em] min-w-0 px-1 font-sans text-sm leading-tight font-medium">
        {video.title}
      </span>
      <div className="pointer-events-none flex min-w-0 flex-wrap items-center gap-1 px-1 pb-0.5">
        {video.level && <PageTag tone="sky">{video.level}</PageTag>}
        <CompletionBadge completions={video.completions} />
        {video.practiceHref ? (
          // The card is the link; only the state shows here: a tick once
          // done (the medal above counts repeats).
          video.completions > 0 && !video.inProgress ? (
            <Check
              aria-label={labels.completed}
              className="text-lesson-correct ml-auto size-4"
            />
          ) : null
        ) : (
          <span className="text-ink-soft ml-auto text-xs">
            {labels.noTranscript}
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
  emptyLabel,
  className,
  labels = en.dictation.browse.card,
  priorityCount = PRIORITY_CARD_COUNT,
  layout = 'grid',
}: {
  videos: BrowseVideoItem[]
  canFavorite: boolean
  id?: string
  emptyLabel?: string
  labels?: BrowseCardLabels
  className?: string
  /** Leading cards loaded eagerly; 0 for lists opened after load. */
  priorityCount?: number
  /** `grid` wraps; `rail` is one horizontally scrolling row (resume shelf). */
  layout?: 'grid' | 'rail'
}) {
  if (videos.length === 0)
    return (
      <p
        id={id}
        className={cn('text-ink-soft p-2 text-sm', className)}
      >
        {emptyLabel ?? labels.empty}
      </p>
    )

  return (
    <ul
      id={id}
      className={cn(
        layout === 'rail'
          ? 'flex snap-x gap-3 overflow-x-auto pb-1'
          : 'motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        className
      )}
    >
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          canFavorite={canFavorite}
          labels={labels}
          priority={index < priorityCount}
          className={
            layout === 'rail' ? 'w-52 shrink-0 snap-start sm:w-56' : undefined
          }
        />
      ))}
    </ul>
  )
}
