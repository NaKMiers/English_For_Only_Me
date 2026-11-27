'use client'

import { AudioPlayer } from '@/components/common/AudioPlayer'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { IeltsAudio, IeltsListeningLine } from '@/modules/ielts/schema'

interface Props {
  audio: IeltsAudio
  lines: IeltsListeningLine[]
}

/**
 * Admin preview of a listening part's audio. Generated audio carries per-line
 * timings, so the player steps line by line and the caption shows who is
 * speaking - handy for checking the voice against the script. An uploaded mp3
 * has no timings and falls back to 5 s skips. Key it by `audio.url`.
 */
export function AdminAudioPlayer({ audio, lines }: Props) {
  const t = useMessages()
  const copy = t.ieltsEditor.audio
  const offsets = audio.lineOffsetsSec

  return (
    <AudioPlayer
      durationSec={audio.durationSec}
      markers={offsets}
      renderCaption={lineIndex => {
        if (!offsets.length)
          return (
            <p className="text-ink-soft px-1 text-xs font-normal">
              {copy.uploadedHint}
            </p>
          )

        const line = lineIndex >= 0 ? lines[lineIndex] : undefined

        return (
          <p
            aria-live="polite"
            className="bg-surface rounded-tag flex min-h-8 min-w-0 items-center gap-2 px-2 text-xs"
          >
            {line ? (
              <>
                <span className="border-line rounded-tag shrink-0 border px-1.5 font-sans font-semibold tabular-nums">
                  {lineIndex + 1}/{offsets.length}
                </span>
                <span className="shrink-0 font-semibold">{line.speaker}</span>
                <span className="text-ink-soft truncate font-normal">
                  {line.text}
                </span>
              </>
            ) : (
              <span className="text-ink-soft font-normal">
                {format(copy.timedLines, { count: offsets.length })}
              </span>
            )}
          </p>
        )
      }}
      src={audio.url}
    />
  )
}
