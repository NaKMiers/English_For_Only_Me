import { Layers } from 'lucide-react'
import Link from 'next/link'

import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'
import type { DictationTopicSummaryRecord } from '@/modules/dictation/types'

interface TopicCardProps {
  href: string
  title: string
  thumbnailUrl?: string | null
  levelRange: string | null
  lessonCount: number
  hasVideoMedia?: boolean
  muted?: boolean
}

function getSafeImageUrl(url: string | null | undefined) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null

    return parsed.toString()
  } catch {
    return null
  }
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
  const safeThumbnailUrl = getSafeImageUrl(thumbnailUrl)

  return (
    <div
      aria-hidden="true"
      className={cn(
        'border-manga-black grid size-16 shrink-0 place-items-center overflow-hidden border-3 bg-cover bg-center font-sans text-2xl font-black shadow-[3px_3px_0_var(--manga-black)] sm:size-20',
        muted
          ? 'bg-manga-paper-soft text-manga-ink-soft'
          : 'bg-manga-pale-red text-manga-black'
      )}
      style={
        safeThumbnailUrl
          ? { backgroundImage: `url("${safeThumbnailUrl}")` }
          : {}
      }
    >
      {safeThumbnailUrl ? null : muted ? (
        <Layers className="size-7" />
      ) : (
        initial
      )}
    </div>
  )
}

function TopicCard({
  href,
  title,
  thumbnailUrl,
  levelRange,
  lessonCount,
  hasVideoMedia,
  muted,
}: TopicCardProps) {
  const lessonLabel = `${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`

  return (
    <Link
      href={href}
      className={cn(
        'border-manga-black hover:bg-manga-pale-red grid grid-cols-[auto_1fr] items-center gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)] transition-colors',
        muted ? 'bg-manga-paper' : 'bg-manga-white'
      )}
    >
      <ThumbTile
        title={title}
        thumbnailUrl={thumbnailUrl}
        muted={muted}
      />
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-manga-red truncate font-sans text-lg font-black">
            {title}
          </span>
          {hasVideoMedia && <PageTag tone="yellow">Video</PageTag>}
        </div>
        <p className="text-manga-ink-soft font-sans text-sm font-black">
          Levels: {levelRange ?? '-'}
        </p>
        <p className="text-manga-ink-soft text-sm">{lessonLabel}</p>
      </div>
    </Link>
  )
}

interface Props {
  topics: DictationTopicSummaryRecord[]
  noTopicCount: number
}

/**
 * The all-topics browse grid. The "Uncategorized" bucket renders as a muted card
 * sorted last, and only when it holds videos (design review D - no-topic).
 */
export function TopicGrid({ topics, noTopicCount }: Props) {
  if (topics.length === 0 && noTopicCount === 0)
    return (
      <div className="border-manga-black bg-manga-white border-3 p-6 text-center shadow-[4px_4px_0_var(--manga-black)]">
        <p className="font-sans text-lg font-black">No lessons yet</p>
        <p className="text-manga-ink-soft mt-1 text-sm">
          Once an admin adds topics and videos, they show up here to browse and
          practice.
        </p>
      </div>
    )

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {topics.map(topic => (
        <TopicCard
          key={topic.id}
          href={`/dictation/${topic.slug}`}
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
          title="Uncategorized"
          levelRange={null}
          lessonCount={noTopicCount}
          muted
        />
      )}
    </div>
  )
}
