'use client'

import { ArrowRight, Headphones, Play } from 'lucide-react'

import { EmptyState } from '@/components/journey/EmptyState'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { SessionEnd } from '@/components/journey/SessionEnd'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type {
  DictationVideoProgress,
  DictationVideoStatsRecord,
} from '@/modules/dictation/types'
import { getDictationResultsAction } from '@/modules/dictation/videoReadiness'

import { DictationVideoThumbnail } from './DictationVideoThumbnail'

/** The results page's one next stop: the next video in the topic. */
export interface ResultsNextStop {
  actionLabel: string
  detail: string
  href: string
  title: string
}

interface Props {
  /** False for a video outside any topic: no "topic is done" line. */
  hasTopic?: boolean
  isEmpty: boolean
  /** The video's topic step, e.g. "TED: 3 to go" (none off-topic). */
  journeyStep?: string | null
  /** Null: the next stop falls back to the dictation landing. */
  next?: ResultsNextStop | null
  progress: DictationVideoProgress
  stats: DictationVideoStatsRecord
  thumbnailUrl?: string | null
  title: string
  videoId: string
  youtubeVideoId?: string | null
}

export function DictationResultsSummary({
  hasTopic = true,
  isEmpty,
  journeyStep = null,
  next = null,
  progress,
  stats,
  thumbnailUrl = null,
  title,
  videoId,
  youtubeVideoId = null,
}: Props) {
  const t = useMessages()
  const text = t.dictation.results
  const action = getDictationResultsAction({ isEmpty, progress, videoId })

  if (!isEmpty)
    return (
      <SessionEnd
        headline={{
          icon: <Headphones />,
          unit: text.headUnit,
          value: `${stats.firstTryWordAccuracy}%`,
        }}
        journeyStep={journeyStep}
        module="dictation"
        nextStop={
          <NextStopCard
            actionIcon={<ArrowRight aria-hidden="true" />}
            actionLabel={
              next?.actionLabel ?? t.dictation.practice.allTopicsAction
            }
            detail={
              next?.detail ??
              (hasTopic
                ? t.dictation.practice.topicDone
                : t.dictation.practice.noTopicNext)
            }
            href={next?.href ?? '/dictation'}
            pinLabel={t.common.journey.nextStop}
            title={next?.title ?? t.dictation.landing.title}
            variant="compact"
          />
        }
        secondary={
          <ActionButton
            href={action.href}
            tone="paper"
          >
            {t.dictation.resultsAction[action.kind]}
          </ActionButton>
        }
        title={title}
        titleId="results-head-title"
        wins={
          <div className="flex flex-wrap items-center gap-3">
            <DictationVideoThumbnail
              title={title}
              thumbnailUrl={thumbnailUrl}
              youtubeVideoId={youtubeVideoId}
              sizes="96px"
              className="w-24 shrink-0"
            />
            <span className="font-medium">
              {format(text.headWins, {
                done: stats.completedSegmentCount,
                percent: stats.completionPercentage,
                total: stats.segmentCount,
              })}
            </span>
          </div>
        }
      />
    )

  // Nothing to show yet: one empty state with the video and one way on.
  return (
    <EmptyState
      action={{
        href: action.href,
        icon: <Play aria-hidden="true" />,
        label: t.dictation.resultsAction[action.kind],
        tone: 'ink',
      }}
      body={
        progress === 'inProgress'
          ? text.inProgressDescription
          : text.practiceFirstDescription
      }
      media={
        <DictationVideoThumbnail
          title={title}
          thumbnailUrl={thumbnailUrl}
          youtubeVideoId={youtubeVideoId}
          sizes="224px"
          className="w-full"
        />
      }
      title={
        progress === 'inProgress'
          ? text.inProgressTitle
          : text.practiceFirstTitle
      }
    />
  )
}
