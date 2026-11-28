import { ChevronRight, PlayCircle, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

import type { BrowseVideoItem } from './BrowseVideoList'

interface Props {
  className?: string
  labels: Messages['dictation']['journey']['side']
  /** The last finished video's results page, if any. */
  latestResultsHref: string | null
  /** Videos with an unfinished session, most recent first. */
  recent: BrowseVideoItem[]
}

function SideRow({
  children,
  href,
  icon,
}: {
  children: ReactNode
  href: string
  icon: ReactNode
}) {
  return (
    <Link
      className="soft-press hover-pop hover:bg-tint-soft rounded-control flex min-h-11 items-center gap-2.5 px-2 py-1.5 text-sm"
      href={href}
    >
      <span
        aria-hidden="true"
        className="text-accent-blue grid size-5 shrink-0 place-items-center [&_svg]:size-4"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight
        aria-hidden="true"
        className="text-ink-soft size-4 shrink-0"
      />
    </Link>
  )
}

/**
 * The dictation landing's side card, folded behind the journey card's
 * handle: recent unfinished videos and the latest results. Favorites sit
 * beside the "Topics" heading instead. A server component.
 */
export function DictationSide({
  className,
  labels,
  latestResultsHref,
  recent,
}: Props) {
  const resumable = recent.filter(video => video.practiceHref)

  return (
    <section
      aria-label={labels.title}
      className={cn(
        'border-line bg-surface rounded-panel flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain border p-3 sm:p-4',
        className
      )}
    >
      <h3 className="text-ink-soft px-2 text-sm font-medium">
        {labels.recent}
      </h3>
      {resumable.length > 0 || latestResultsHref ? (
        <ul className="grid gap-1">
          {resumable.map(video => (
            <li key={video.id}>
              <SideRow
                href={video.practiceHref ?? '/dictation'}
                icon={<PlayCircle />}
              >
                {video.title}
              </SideRow>
            </li>
          ))}
          {latestResultsHref ? (
            <li>
              <SideRow
                href={latestResultsHref}
                icon={<Trophy />}
              >
                {labels.latestResults}
              </SideRow>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-ink-soft px-2 text-sm">{labels.recentEmpty}</p>
      )}
    </section>
  )
}
