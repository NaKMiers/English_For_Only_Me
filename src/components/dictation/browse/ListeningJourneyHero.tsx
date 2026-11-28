import {
  ArrowRight,
  CalendarClock,
  Flame,
  Headphones,
  Play,
  RotateCcw,
  Video,
  type LucideIcon,
} from 'lucide-react'

import {
  JourneyCard,
  JourneyHeadline,
  MilestoneNote,
} from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { DrawerHandle } from '@/components/journey/SideDrawer'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

import { formatDuration } from '../formatDuration'
import { listeningTrack } from './listeningJourney'

/** Where the next stop points: a video to resume, due review or a topic. */
export interface ListeningNextStop {
  detail: string
  href: string
  kind: 'video' | 'review' | 'topic'
  title: string
}

interface Props {
  /** `common.journey`: the shared next stop and drawer words. */
  journey: Messages['common']['journey']
  labels: Messages['dictation']
  next: ListeningNextStop | null
  stats: DictationGlobalStatsRecord
  /** Adds the side drawer handle (recent videos, favorites). */
  withDrawer?: boolean
}

const BAR_COUNT = 56

/** A fixed, natural-looking waveform: same shape on every render. */
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const wave =
    Math.abs(Math.sin(index * 0.71) * 0.6 + Math.sin(index * 0.23) * 0.4) * 0.75
  return Math.round(22 + wave * 78)
})

/**
 * The top of the dictation page on the shared `JourneyCard`: the listening
 * journey as a track playing. Every sentence written by ear is one step;
 * the waveform scrubber plays from the last track reached toward the next
 * one, so the next goal is always in sight. Four small numbers and the one
 * next stop sit beside it.
 */
export function ListeningJourneyHero({
  journey,
  labels,
  next,
  stats,
  withDrawer = false,
}: Props) {
  const t = labels.journey
  const sentences = stats.completedSegmentCount
  const track = listeningTrack(sentences)
  const playedBars = Math.round(track.progress * BAR_COUNT)
  const numbers: {
    href?: string
    icon: LucideIcon
    label: string
    value: string
  }[] = [
    {
      icon: Video,
      label: t.videosDone,
      value: `${stats.completedVideoCount}/${stats.totalVideoCount}`,
    },
    {
      icon: Flame,
      label: t.streak,
      value: String(stats.activeStreakDays),
    },
    {
      icon: CalendarClock,
      label: t.thisWeek,
      value: formatDuration(labels.duration, stats.weeklyPracticeTimeMs),
    },
    {
      href: '/dictation/review',
      icon: RotateCcw,
      label: t.reviewDue,
      value: String(stats.dueReviewItemCount),
    },
  ]
  const actionLabel =
    next?.kind === 'video'
      ? t.continueVideo
      : next?.kind === 'review'
        ? t.startReview
        : t.openTopic

  return (
    <JourneyCard
      handle={
        withDrawer ? (
          <DrawerHandle
            accentClassName="text-accent-blue"
            hideLabel={t.side.hide}
            showLabel={t.side.show}
          />
        ) : undefined
      }
      headline={
        <JourneyHeadline
          unit={plural(t.sentences, sentences)}
          value={sentences.toLocaleString()}
        />
      }
      metaphor={
        // The scrubber: a waveform played up to where the learner is.
        <div className="bg-surface/80 rounded-control grid gap-2 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium">
              {format(t.nowPlaying, { number: track.number })}
            </span>
            <span className="text-ink-soft tabular-nums">
              {track.from.toLocaleString()} → {track.to.toLocaleString()}
            </span>
          </div>
          <div
            aria-label={format(t.scrubber, {
              done: sentences - track.from,
              number: track.number,
              target: track.to - track.from,
            })}
            aria-valuemax={track.to}
            aria-valuemin={track.from}
            aria-valuenow={sentences}
            className="relative flex h-16 items-end gap-[3px]"
            role="progressbar"
          >
            {BAR_HEIGHTS.map((height, index) => {
              const played = index < playedBars
              // The few bars just behind the playhead dance like a live meter.
              const live = played && index >= playedBars - 4

              return (
                <span
                  aria-hidden="true"
                  className={cn(
                    'min-w-0 flex-1 origin-bottom rounded-full',
                    played ? 'bg-accent-blue' : 'bg-accent-blue/20',
                    live && 'eq-live'
                  )}
                  key={index}
                  style={{
                    animationDelay: live ? `${(index % 4) * 140}ms` : undefined,
                    height: `${height}%`,
                  }}
                />
              )
            })}
            {/* The playhead: where the learner is, in the "you are here" pink. */}
            <span
              aria-hidden="true"
              className="bg-brand absolute inset-y-0 w-0.5 rounded-full"
              style={{ left: `${track.progress * 100}%` }}
            >
              <span className="bg-brand absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
            </span>
          </div>
        </div>
      }
      milestone={
        <MilestoneNote>
          {plural(t.toNext, track.left, { number: track.number })}
        </MilestoneNote>
      }
      module="dictation"
      nextStop={
        <NextStopCard
          actionIcon={
            next?.kind === 'video' ? (
              <Play
                aria-hidden="true"
                className="fill-current"
              />
            ) : (
              <ArrowRight aria-hidden="true" />
            )
          }
          actionLabel={actionLabel}
          detail={next?.detail}
          done={
            next
              ? undefined
              : { icon: <Headphones aria-hidden="true" />, text: t.pickTopic }
          }
          href={next?.href ?? null}
          pinLabel={journey.nextStop}
          title={next?.title ?? ''}
        />
      }
      stats={
        <StatStrip>
          {numbers.map(item => (
            <StatChip
              href={item.href}
              icon={item.icon}
              key={item.label}
              label={item.label}
              tone="dictation"
              value={item.value}
            />
          ))}
        </StatStrip>
      }
      title={t.title}
      titleId="listening-journey-title"
    />
  )
}
