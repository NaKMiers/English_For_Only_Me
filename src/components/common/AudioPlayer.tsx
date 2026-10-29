'use client'

import { Slider } from '@base-ui/react/slider'
import {
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { formatClock, lineIndexAt, lineSeekTarget } from './audioTimeline'

interface Props {
  className?: string
  /** Known length, shown before the file's metadata loads. */
  durationSec?: number
  /**
   * Start time of each script line. With markers the skip buttons step line by
   * line and the bar marks every line; without them skips jump 10 s.
   */
  markers?: number[]
  /** Optional row under the controls, given the current marker index (-1 before the first). */
  renderCaption?: (markerIndex: number) => ReactNode
  src: string
}

const RATES = [1, 1.25, 1.5, 0.75]
const SKIP_SEC = 10

const SMALL_BUTTON_CLASS =
  'border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control sticker-press grid size-9 shrink-0 place-items-center border-2 shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50'

/** The big black play/pause key, shared with read-only players (mock tests). */
export const AUDIO_PLAY_BUTTON_CLASS =
  'border-manga-black bg-manga-black text-manga-white hover:bg-manga-red rounded-control sticker-press grid size-11 shrink-0 place-items-center border-2 shadow-[3px_3px_0_var(--manga-red)] transition-colors active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50'

const TRACK_CLASS =
  'border-manga-black bg-manga-white relative h-2.5 w-full overflow-hidden rounded-full border-2'

/** "1:23 / 6:53", current time bold and total muted. */
export function AudioClock({
  duration,
  time,
}: {
  duration: number
  time: number
}) {
  return (
    <span className="font-sans text-xs font-black whitespace-nowrap tabular-nums">
      {formatClock(time)}
      <span className="text-manga-ink-soft"> / {formatClock(duration)}</span>
    </span>
  )
}

/** The player's progress track without a thumb, for audio that cannot seek. */
export function AudioMeter({
  duration,
  label,
  time,
}: {
  duration: number
  label: string
  time: number
}) {
  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0

  return (
    <div
      aria-label={label}
      aria-valuemax={Math.round(duration)}
      aria-valuemin={0}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
      className={TRACK_CLASS}
      role="progressbar"
    >
      <div
        className="bg-manga-red h-full transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/**
 * The app's audio player, in the manga sticker style: play/pause, two skip
 * keys, a seek bar, the clock and a speed toggle. Key it by `src` so a new
 * file starts from zero.
 */
export function AudioPlayer({
  className,
  durationSec = 0,
  markers = [],
  renderCaption,
  src,
}: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(durationSec)
  const [rate, setRate] = useState(1)

  const timed = markers.length > 0
  const total = duration || 1

  const seek = (target: number) => {
    const element = ref.current
    const next = Math.min(Math.max(target, 0), total)

    if (element) element.currentTime = next
    setTime(next)
  }

  const toggle = () => {
    const element = ref.current

    if (!element) return
    if (element.paused) void element.play()
    else element.pause()
  }

  const step = (direction: -1 | 1) => {
    if (!timed) {
      seek(time + direction * SKIP_SEC)
      return
    }

    const target = lineSeekTarget(markers, time, direction)

    if (target !== null) seek(target)
  }

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]

    if (ref.current) ref.current.playbackRate = next
    setRate(next)
  }

  const BackIcon = timed ? SkipBack : RotateCcw
  const ForwardIcon = timed ? SkipForward : RotateCw

  return (
    <div
      className={cn(
        'border-manga-black bg-manga-paper-soft rounded-control grid gap-2 border-2 p-2',
        className
      )}
    >
      <audio
        onDurationChange={event => {
          const value = event.currentTarget.duration

          if (Number.isFinite(value) && value > 0) setDuration(value)
        }}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
        preload="metadata"
        ref={ref}
        src={src}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* Player transport (aria-pressed toggle): documented raw exception. */}
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
          className={AUDIO_PLAY_BUTTON_CLASS}
          onClick={toggle}
          title={playing ? 'Pause' : 'Play'}
          type="button"
        >
          {playing ? (
            <Pause
              aria-hidden="true"
              className="size-5 fill-current"
            />
          ) : (
            <Play
              aria-hidden="true"
              className="size-5 translate-x-px fill-current"
            />
          )}
        </button>
        <button
          aria-label={timed ? 'Previous line' : `Back ${SKIP_SEC} seconds`}
          className={SMALL_BUTTON_CLASS}
          onClick={() => step(-1)}
          title={timed ? 'Previous line' : `Back ${SKIP_SEC} s`}
          type="button"
        >
          <BackIcon
            aria-hidden="true"
            className="size-4"
          />
        </button>
        <button
          aria-label={timed ? 'Next line' : `Forward ${SKIP_SEC} seconds`}
          className={SMALL_BUTTON_CLASS}
          onClick={() => step(1)}
          title={timed ? 'Next line' : `Forward ${SKIP_SEC} s`}
          type="button"
        >
          <ForwardIcon
            aria-hidden="true"
            className="size-4"
          />
        </button>

        <Slider.Root
          className="order-last basis-full sm:order-none sm:min-w-32 sm:flex-1 sm:basis-auto"
          max={total}
          min={0}
          onValueChange={value => seek(value)}
          step={0.1}
          value={Math.min(time, total)}
        >
          <Slider.Control className="relative flex h-6 w-full cursor-pointer touch-none items-center select-none">
            <Slider.Track className={TRACK_CLASS}>
              <Slider.Indicator className="bg-manga-red h-full" />
              {markers.slice(1).map(marker => (
                <span
                  aria-hidden="true"
                  className="bg-manga-black/35 absolute inset-y-0 w-px"
                  key={marker}
                  style={{ left: `${(marker / total) * 100}%` }}
                />
              ))}
            </Slider.Track>
            <Slider.Thumb
              className="border-manga-black bg-manga-white has-focus-visible:ring-manga-red/40 size-4 rounded-full border-2 shadow-[1px_1px_0_var(--manga-black)] has-focus-visible:ring-4"
              getAriaLabel={() => 'Seek'}
              getAriaValueText={(_formatted, value) =>
                `${formatClock(value)} of ${formatClock(total)}`
              }
            />
          </Slider.Control>
        </Slider.Root>

        <span className="ml-auto sm:ml-0">
          <AudioClock
            duration={duration}
            time={time}
          />
        </span>
        <button
          aria-label={`Playback speed ${rate}x`}
          className={cn(
            SMALL_BUTTON_CLASS,
            'w-12 font-sans text-xs font-black'
          )}
          onClick={cycleRate}
          title="Change speed"
          type="button"
        >
          {rate}×
        </button>
      </div>

      {renderCaption?.(lineIndexAt(markers, time))}
    </div>
  )
}
