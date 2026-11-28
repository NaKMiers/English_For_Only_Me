import {
  ArrowRight,
  CalendarClock,
  Flame,
  Headphones,
  Play,
  Video,
  type LucideIcon,
} from 'lucide-react'

import { JourneyCard, JourneyHeadline } from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { DrawerHandle } from '@/components/journey/SideDrawer'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { DUE_ICON } from '@/constants/stateIcons'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

import { DictationVideoThumbnail } from '../DictationVideoThumbnail'
import { formatDuration } from '../formatDuration'
import { listeningTrack } from './listeningJourney'

/** Where the next stop points: a video to resume, due review or a topic. */
export interface ListeningNextStop {
  detail: string
  href: string
  /** The topic's tile image (https only), for `topic`. */
  image?: string | null
  kind: 'video' | 'review' | 'topic'
  /** The video's thumbnail fields, for `video`. */
  thumbnail?: { thumbnailUrl: string | null; youtubeVideoId: string | null }
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
 * The top of the dictation page on the shared `JourneyCard`, kept short: the
 * listening journey as a track playing. Every sentence written by ear is one
 * step; the waveform scrubber plays from the last track reached toward the
 * next one. Above it, plain text with no panel: the sentences to go beside
 * the playhead and the next track at the end. Four chips sit top right; the
 * next stop is a small card in a narrow column that hides while the side
 * drawer is open.
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
      icon: DUE_ICON,
      label: t.reviewDue,
      value: String(stats.dueReviewItemCount),
    },
  ]
  // The stop's picture: the video's thumbnail, or the topic's tile image.
  const media =
    next?.kind === 'video' &&
    (next.thumbnail?.thumbnailUrl || next.thumbnail?.youtubeVideoId) ? (
      <DictationVideoThumbnail
        priority
        sizes="160px"
        thumbnailUrl={next.thumbnail.thumbnailUrl}
        title={next.title}
        youtubeVideoId={next.thumbnail.youtubeVideoId}
      />
    ) : next?.kind === 'topic' && next.image ? (
      <span className="border-line bg-tint rounded-control block aspect-video overflow-hidden border">
        {/* A plain img like the topic records: res.cloudinary.com is not in
            images.remotePatterns. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          src={next.image}
        />
      </span>
    ) : undefined
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
        // The scrubber: a waveform played up to where the learner is, with
        // the sentences to go at the playhead and the next track at the end.
        <div className="grid gap-1.5">
          <div className="relative h-4 text-xs whitespace-nowrap">
            <span
              className={cn(
                'text-accent-blue absolute top-0 font-medium tabular-nums',
                // Past the middle the label sits left of the playhead, so it
                // never runs into the track name at the end.
                track.progress > 0.55
                  ? '-translate-x-[calc(100%+8px)]'
                  : 'translate-x-2'
              )}
              data-listening-left=""
              style={{ left: `${track.progress * 100}%` }}
            >
              <span className="sr-only">
                {plural(t.toNext, track.left, {
                  count: track.left.toLocaleString(),
                  number: track.number,
                })}
              </span>
              <span aria-hidden="true">
                {plural(t.sentencesToGo, track.left, {
                  count: track.left.toLocaleString(),
                })}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="text-ink-soft absolute top-0 right-0 tabular-nums"
            >
              <span className="text-ink font-medium">
                {format(t.track, { number: track.number })}
              </span>
              <span className="max-sm:hidden">
                {' '}
                · {track.to.toLocaleString()}
              </span>
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
            className="relative flex h-12 items-end gap-[3px]"
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
      asideWidth={media ? 'lg' : 'sm'}
      layout="aside"
      module="dictation"
      nextStopHidesWithDrawer
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
          media={media}
          pinLabel={journey.nextStop}
          size="sm"
          title={next?.title ?? ''}
        />
      }
      stats={
        <StatStrip className="sm:justify-end">
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
