import { CalendarClock, Flame, ListChecks, Video } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

interface Props {
  dictationStats?: DictationGlobalStatsRecord | null
}

export function HomeIeltsSnapshot({ dictationStats = null }: Props) {
  const metrics = [
    {
      label: 'Listening streak',
      value: `${dictationStats?.activeStreakDays ?? 0}`,
      detail: 'days',
      icon: (
        <Flame
          aria-hidden="true"
          className="size-5"
        />
      ),
      tone: 'red' as const,
    },
    {
      label: 'Videos completed',
      value: `${dictationStats?.completedVideoCount ?? 0}`,
      detail: `${dictationStats?.totalVideoCount ?? 0} saved videos`,
      icon: (
        <Video
          aria-hidden="true"
          className="size-5"
        />
      ),
    },
    {
      label: 'Weak words',
      value: `${dictationStats?.weakWords.length ?? 0}`,
      detail: 'from saved attempts',
      icon: (
        <ListChecks
          aria-hidden="true"
          className="size-5"
        />
      ),
    },
    {
      label: 'Next review',
      value: `${dictationStats?.dueReviewItemCount ?? 0}`,
      detail: 'items due',
      icon: (
        <CalendarClock
          aria-hidden="true"
          className="size-5"
        />
      ),
      tone: 'ink' as const,
    },
  ]

  return (
    <section
      aria-label="IELTS progress snapshot"
      className="grid gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map(metric => (
          <MetricTile
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </div>

      <MangaPanel
        eyebrow="This week"
        title="Focus"
        className="bg-manga-paper-soft"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {dictationStats && dictationStats.dueReviewItemCount > 0
            ? 'Start with due weak-sentence review, then continue the unfinished Dictation videos.'
            : 'Keep the homepage focused on the whole English system while Dictation Lab tracks real listening work.'}
        </p>
      </MangaPanel>
    </section>
  )
}
