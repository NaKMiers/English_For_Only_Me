import {
  ArrowRight,
  CalendarClock,
  Flame,
  ListChecks,
  Video,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

import { formatDuration } from '../formatDuration'

interface Props {
  /** From the page's `getMessages()`: this stays a server component. */
  labels: Messages['dictation']
  stats: DictationGlobalStatsRecord
}

interface Chip {
  detail: string
  icon: LucideIcon
  label: string
  tone: string
  value: string
}

/**
 * The landing page's one-line progress summary: four small numbers and a
 * link to the full stats page, instead of the whole stats dashboard pushing
 * the topics below the fold.
 */
export function DictationStatsStrip({ labels, stats }: Props) {
  const text = labels.globalStats
  const chips: Chip[] = [
    {
      detail: plural(text.savedVideos, stats.totalVideoCount),
      icon: Video,
      label: text.completedVideos,
      tone: 'bg-pastel-sky text-accent-blue',
      value: `${stats.completedVideoCount}`,
    },
    {
      detail: text.completedSegmentsDetail,
      icon: ListChecks,
      label: text.completedSegments,
      tone: 'bg-pastel-mint text-accent-green',
      value: `${stats.completedSegmentCount}`,
    },
    {
      detail: format(text.thisMonth, {
        duration: formatDuration(labels.duration, stats.monthlyPracticeTimeMs),
      }),
      icon: CalendarClock,
      label: text.thisWeek,
      tone: 'bg-pastel-lilac text-accent-purple',
      value: formatDuration(labels.duration, stats.weeklyPracticeTimeMs),
    },
    {
      detail: plural(text.reviewDue, stats.dueReviewItemCount),
      icon: Flame,
      label: text.streak,
      tone: 'bg-pastel-peach text-accent-orange',
      value: `${stats.activeStreakDays}`,
    },
  ]

  return (
    <section
      aria-label={labels.landing.statsLabel}
      className="border-line bg-surface grid grid-cols-2 gap-1 rounded-3xl border p-2 sm:gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-center"
    >
      {chips.map(chip => {
        const Icon = chip.icon

        return (
          <div
            className="flex min-w-0 items-center gap-2.5 rounded-2xl px-1.5 py-1 sm:gap-3 sm:px-2 sm:py-1.5"
            key={chip.label}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full sm:size-10 ${chip.tone}`}
            >
              <Icon
                aria-hidden="true"
                className="size-[18px]"
              />
            </span>
            <span className="grid min-w-0">
              <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <strong className="font-sans text-xl leading-tight font-medium tabular-nums">
                  {chip.value}
                </strong>
                <span className="truncate text-xs font-medium">
                  {chip.label}
                </span>
              </span>
              <span className="text-ink-soft hidden truncate text-xs sm:block">
                {chip.detail}
              </span>
            </span>
          </div>
        )
      })}
      <Link
        className="soft-press hover:bg-tint text-brand-ink col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors lg:col-span-1"
        href="/dictation/stats"
      >
        {labels.landing.fullStats}
        <ArrowRight
          aria-hidden="true"
          className="size-4"
        />
      </Link>
    </section>
  )
}
