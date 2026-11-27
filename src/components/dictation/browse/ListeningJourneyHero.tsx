import {
  ArrowRight,
  AudioLines,
  CalendarClock,
  Flame,
  MapPin,
  RotateCcw,
  Video,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { ActionButton } from '@/components/ui/ActionButton'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

import { formatDuration } from '../formatDuration'
import { listeningTrack } from './listeningJourney'

/** Where the "Next stop" card points: a video to resume or a topic. */
export interface ListeningNextStop {
  detail: string
  href: string
  kind: 'video' | 'topic'
  title: string
}

interface Props {
  labels: Messages['dictation']
  next: ListeningNextStop | null
  stats: DictationGlobalStatsRecord
}

const BAR_COUNT = 56

/** A fixed, natural-looking waveform: same shape on every render. */
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const wave =
    Math.abs(Math.sin(index * 0.71) * 0.6 + Math.sin(index * 0.23) * 0.4) * 0.75
  return Math.round(22 + wave * 78)
})

/**
 * The top of the dictation page: the listening journey as a track playing.
 * Every sentence written by ear is one step; the waveform scrubber plays
 * from the last track reached toward the next one, so the next goal is
 * always in sight. Four small numbers and the one next stop sit beside it.
 */
export function ListeningJourneyHero({ labels, next, stats }: Props) {
  const t = labels.journey
  const sentences = stats.completedSegmentCount
  const track = listeningTrack(sentences)
  const playedBars = Math.round(track.progress * BAR_COUNT)
  const numbers: {
    href?: string
    icon: LucideIcon
    label: string
    tone: string
    value: string
  }[] = [
    {
      icon: Video,
      label: t.videosDone,
      tone: 'bg-pastel-sky text-accent-blue',
      value: `${stats.completedVideoCount}/${stats.totalVideoCount}`,
    },
    {
      icon: Flame,
      label: t.streak,
      tone: 'bg-pastel-peach text-accent-orange',
      value: String(stats.activeStreakDays),
    },
    {
      icon: CalendarClock,
      label: t.thisWeek,
      tone: 'bg-pastel-lilac text-accent-purple',
      value: formatDuration(labels.duration, stats.weeklyPracticeTimeMs),
    },
    {
      href: '/dictation/review',
      icon: RotateCcw,
      label: t.reviewDue,
      tone: 'bg-pastel-rose text-brand-ink',
      value: String(stats.dueReviewItemCount),
    },
  ]

  return (
    <section
      aria-labelledby="listening-journey-title"
      className="border-line rounded-panel from-pastel-sky via-pastel-lilac/40 to-surface grid gap-5 border bg-linear-160 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
    >
      <div className="grid min-w-0 content-between gap-6">
        <div className="grid gap-1">
          <h2
            className="text-accent-blue flex items-center gap-2 text-sm font-medium"
            id="listening-journey-title"
          >
            <AudioLines
              aria-hidden="true"
              className="size-4"
            />
            {t.title}
          </h2>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong className="font-sans text-6xl leading-none font-light tracking-tight tabular-nums">
              {sentences.toLocaleString()}
            </strong>
            <span className="font-sans text-xl font-medium">{t.sentences}</span>
          </p>
          <p className="text-ink-soft text-sm">{t.hint}</p>
        </div>

        {/* The scrubber: a waveform played up to where the learner is. */}
        <div className="bg-surface/80 grid gap-2 rounded-[22px] p-3 sm:p-4">
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
            <span
              aria-hidden="true"
              className="bg-ink absolute inset-y-0 w-0.5 rounded-full"
              style={{ left: `${track.progress * 100}%` }}
            >
              <span className="bg-ink absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
            </span>
          </div>
          <p className="text-sm font-medium">
            {plural(t.toNext, track.left, { number: track.number })}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {numbers.map(item => {
            const Icon = item.icon
            const body = (
              <>
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full',
                    item.tone
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                  />
                </span>
                <span className="grid min-w-0">
                  <dt className="text-ink-soft truncate text-[11px]">
                    {item.label}
                  </dt>
                  <dd className="font-sans text-lg leading-tight font-medium tabular-nums">
                    {item.value}
                  </dd>
                </span>
              </>
            )

            return item.href ? (
              <Link
                className="soft-press hover-pop bg-surface/80 hover:bg-surface flex items-center gap-2.5 rounded-2xl p-2.5"
                href={item.href}
                key={item.label}
              >
                {body}
              </Link>
            ) : (
              <div
                className="bg-surface/80 flex items-center gap-2.5 rounded-2xl p-2.5"
                key={item.label}
              >
                {body}
              </div>
            )
          })}
        </dl>
      </div>

      {/* Next stop: resume the last video, or open the topic nearest gold. */}
      <div className="bg-surface shadow-card grid min-w-0 content-between gap-5 rounded-[24px] p-5">
        <span className="bg-brand-soft text-brand-ink inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <MapPin
            aria-hidden="true"
            className="size-3.5"
          />
          {t.nextStop}
        </span>
        {next ? (
          <>
            <div className="grid gap-1">
              <p className="text-ink-soft truncate text-sm">{next.detail}</p>
              <p className="line-clamp-3 font-sans text-2xl leading-tight font-medium tracking-tight wrap-break-word">
                {next.title}
              </p>
            </div>
            <ActionButton
              className="justify-self-start"
              href={next.href}
              icon={
                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                />
              }
              tone="ink"
            >
              {next.kind === 'video' ? t.continueVideo : t.openTopic}
            </ActionButton>
          </>
        ) : (
          <p className="text-ink-soft text-sm leading-6">{t.pickTopic}</p>
        )}
      </div>
    </section>
  )
}
