'use client'

import { AudioPlayer } from '@/components/common/AudioPlayer'
import type { IeltsAudio, IeltsListeningLine } from '@/modules/ielts/schema'

interface Props {
  audio: IeltsAudio
  lines: IeltsListeningLine[]
}

/**
 * Admin preview of a listening part's audio. Generated audio carries per-line
 * timings, so the player steps line by line and the caption shows who is
 * speaking - handy for checking the voice against the script. An uploaded mp3
 * has no timings and falls back to 10 s skips. Key it by `audio.url`.
 */
export function AdminAudioPlayer({ audio, lines }: Props) {
  const offsets = audio.lineOffsetsSec

  return (
    <AudioPlayer
      durationSec={audio.durationSec}
      markers={offsets}
      renderCaption={lineIndex => {
        if (!offsets.length)
          return (
            <p className="text-manga-ink-soft px-1 text-xs font-semibold">
              Uploaded mp3: no per-line timings, so skips jump 10 s.
            </p>
          )

        const line = lineIndex >= 0 ? lines[lineIndex] : undefined

        return (
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
        )
      }}
      src={audio.url}
    />
  )
}
