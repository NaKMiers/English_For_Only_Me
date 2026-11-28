'use client'

import { ArrowRight, Headphones } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
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
            <span className="grid gap-1">
              <span className="font-medium">
                {format(text.headWins, {
                  done: stats.completedSegmentCount,
                  percent: stats.completionPercentage,
                  total: stats.segmentCount,
                })}
              </span>
              <span className="text-ink-soft text-xs">{text.builtFrom}</span>
            </span>
          </div>
        }
      />
    )

  return (
    <ContentPanel
      eyebrow={text.eyebrow[progress]}
      title={title}
      action={
        <ActionButton
          href={action.href}
          tone="paper"
        >
          {t.dictation.resultsAction[action.kind]}
        </ActionButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-ink-soft text-base leading-7 font-normal">
          {progress === 'inProgress'
            ? text.inProgressEmpty
            : text.notStartedEmpty}
        </p>
        <DictationVideoThumbnail
          title={title}
          thumbnailUrl={thumbnailUrl}
          youtubeVideoId={youtubeVideoId}
          sizes="(min-width: 640px) 30vw, 100vw"
          className="w-full max-w-xs sm:w-56"
        />
      </div>
    </ContentPanel>
  )
}
