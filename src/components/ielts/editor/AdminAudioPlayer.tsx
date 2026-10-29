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
import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsAudio, IeltsListeningLine } from '@/modules/ielts/schema'

import { formatClock, lineIndexAt, lineSeekTarget } from './audioTimeline'

interface Props {
  audio: IeltsAudio
  lines: IeltsListeningLine[]
}

const RATES = [1, 1.25, 1.5, 0.75]
const SKIP_SEC = 10

const SMALL_BUTTON_CLASS =
  'border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control sticker-press grid size-9 shrink-0 place-items-center border-2 shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50'

/**
 * Admin preview of a listening part's audio. Generated audio carries per-line
 * timings, so the skip buttons step line by line, the seek bar marks each line
 * and the caption shows who is speaking - handy for checking the voice against
 * the script. An uploaded mp3 has no timings and falls back to 10 s skips.
 * Parent should key it by `audio.url` so a new file starts from zero.
 */
export function AdminAudioPlayer({ audio, lines }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(audio.durationSec)
  const [rate, setRate] = useState(1)

  const offsets = audio.lineOffsetsSec
  const timed = offsets.length > 0
  const lineIndex = lineIndexAt(offsets, time)
  const line = lineIndex >= 0 ? lines[lineIndex] : undefined
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

    const target = lineSeekTarget(offsets, time, direction)

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
    <div className="border-manga-black bg-manga-paper-soft rounded-control grid gap-2 border-2 p-2">
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
        src={audio.url}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* Player transport (aria-pressed toggle): documented raw exception. */}
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
          className="border-manga-black bg-manga-black text-manga-white hover:bg-manga-red rounded-control sticker-press grid size-11 shrink-0 place-items-center border-2 shadow-[3px_3px_0_var(--manga-red)] transition-colors active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
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
            <Slider.Track className="border-manga-black bg-manga-white relative h-2.5 w-full overflow-hidden rounded-full border-2">
              <Slider.Indicator className="bg-manga-red h-full" />
              {offsets.slice(1).map(offset => (
                <span
                  aria-hidden="true"
                  className="bg-manga-black/35 absolute inset-y-0 w-px"
                  key={offset}
                  style={{ left: `${(offset / total) * 100}%` }}
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

        <span className="ml-auto font-sans text-xs font-black whitespace-nowrap tabular-nums sm:ml-0">
          {formatClock(time)}
          <span className="text-manga-ink-soft">
            {' '}
            / {formatClock(duration)}
          </span>
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

      {timed ? (
        <p
          aria-live="polite"
          className="bg-manga-white rounded-tag flex min-h-8 min-w-0 items-center gap-2 px-2 text-xs"
        >
          {line ? (
            <>
              <span className="border-manga-black rounded-tag shrink-0 border-2 px-1.5 font-sans font-black tabular-nums">
                {lineIndex + 1}/{offsets.length}
              </span>
              <span className="shrink-0 font-black uppercase">
                {line.speaker}
              </span>
              <span className="text-manga-ink-soft truncate font-semibold">
                {line.text}
              </span>
            </>
          ) : (
            <span className="text-manga-ink-soft font-semibold">
              {offsets.length} timed lines. Press play or step to a line.
            </span>
          )}
        </p>
      ) : (
        <p className="text-manga-ink-soft px-1 text-xs font-semibold">
          Uploaded mp3: no per-line timings, so skips jump {SKIP_SEC} s.
        </p>
      )}
    </div>
  )
}
