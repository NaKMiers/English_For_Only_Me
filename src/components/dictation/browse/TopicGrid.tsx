import { Layers } from 'lucide-react'
import Link from 'next/link'

import { PageTag } from '@/components/ui/PageTag'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'
import type { DictationTopicSummaryRecord } from '@/modules/dictation/types'

import { getTopicTileImageUrl } from './topicThumbnailUrl'

type BrowseLabels = Messages['dictation']['browse']

interface TopicCardProps {
  href: string
  labels: BrowseLabels
  title: string
  thumbnailUrl?: string | null
  levelRange: string | null
  lessonCount: number
  hasVideoMedia?: boolean
  muted?: boolean
}

function ThumbTile({
  title,
  thumbnailUrl,
  muted,
}: {
  title: string
  thumbnailUrl?: string | null
  muted?: boolean
}) {
  const initial = title.trim().charAt(0).toUpperCase() || '?'
  const tileImageUrl = getTopicTileImageUrl(thumbnailUrl)

  return (
    <div
      aria-hidden="true"
      className={cn(
        'border-line rounded-control grid size-14 shrink-0 place-items-center overflow-hidden border font-sans text-xl font-medium',
        muted ? 'bg-tint text-ink-soft' : 'bg-tint-soft text-ink'
      )}
    >
      {tileImageUrl ? (
        // A plain lazy img: res.cloudinary.com is not in images.remotePatterns,
        // and the account's Strict Transformations rule out a resize URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tileImageUrl}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : muted ? (
        <Layers className="size-7" />
      ) : (
        initial
      )}
    </div>
  )
}

function TopicCard({
  href,
  labels,
  title,
  thumbnailUrl,
  levelRange,
  lessonCount,
  hasVideoMedia,
  muted,
}: TopicCardProps) {
  const lessonLabel = plural(labels.lessons, lessonCount)

  return (
    <Link
      href={href}
      className={cn(
        'border-line hover:bg-tint-soft hover-pop soft-press rounded-panel grid grid-cols-[auto_1fr] items-center gap-3 border p-2.5',
        muted ? 'bg-tint' : 'bg-surface'
      )}
    >
      <ThumbTile
        title={title}
        thumbnailUrl={thumbnailUrl}
        muted={muted}
      />
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-sans text-base font-medium">
            {title}
          </span>
          {hasVideoMedia && <PageTag tone="yellow">{labels.video}</PageTag>}
        </div>
        <p className="text-ink-soft truncate text-xs">
          {format(labels.levels, { range: levelRange ?? '-' })} · {lessonLabel}
        </p>
      </div>
    </Link>
  )
}

interface Props {
  topics: DictationTopicSummaryRecord[]
  noTopicCount: number
  /** From the page's `getMessages()`: this stays a server component. */
  labels?: BrowseLabels
}

/**
 * The all-topics browse grid. The "Uncategorized" bucket renders as a muted card
 * sorted last, and only when it holds videos (design review D - no-topic).
 */
export function TopicGrid({
  topics,
  noTopicCount,
  labels = en.dictation.browse,
}: Props) {
  if (topics.length === 0 && noTopicCount === 0)
    return (
      <div className="border-line bg-surface rounded-panel border p-6 text-center">
        <p className="font-sans text-lg font-semibold">{labels.noLessons}</p>
        <p className="text-ink-soft mt-1 text-sm">
          {labels.noLessonsDescription}
        </p>
      </div>
    )

  return (
    <div className="motion-stagger grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {topics.map(topic => (
        <TopicCard
          key={topic.id}
          href={`/dictation/${topic.slug}`}
          labels={labels}
          title={topic.title}
          thumbnailUrl={topic.thumbnailUrl}
          levelRange={topic.levelRange}
          lessonCount={topic.lessonCount}
          hasVideoMedia={topic.hasVideoMedia}
        />
      ))}
      {noTopicCount > 0 && (
        <TopicCard
          href="/dictation/no-topic"
          labels={labels}
          title={labels.uncategorized}
          levelRange={null}
          lessonCount={noTopicCount}
        />
      )}
    </div>
  )
}
