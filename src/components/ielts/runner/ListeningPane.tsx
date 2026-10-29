'use client'

import { Check, Hourglass, Lock, Play, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AUDIO_PLAY_BUTTON_CLASS,
  AudioClock,
  AudioMeter,
  AudioPlayer,
} from '@/components/common/AudioPlayer'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_MAX_AUDIO_INTERRUPTIONS } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { postIeltsAudioEventApi } from '@/requests/ieltsApi'

import { highlightText, type IeltsHighlight } from './PassagePane'
import { ExamButton } from '@/components/ielts/ui'

interface Props {
  attempt: IeltsAttemptRecord
  highlight: (IeltsHighlight & { sectionKey: string }) | null
  locked: boolean
  onAttemptChange: (attempt: IeltsAttemptRecord) => void
  onNotice: (message: string) => void
  onPartChange: (part: number) => void
  sections: IeltsPublicSection[]
  showTranscript: boolean
  visiblePart: number
}

function Transcript({
  highlight,
  section,
}: {
  highlight: Props['highlight']
  section: IeltsPublicSection
}) {
  const lines = section.listening?.lines

  if (!lines?.length) return null

  return (
    <ol
      aria-label="Transcript"
      data-highlight-scope={`transcript:${section.key}`}
      className="font-body grid gap-2 text-[17px] leading-[1.7]"
    >
      {lines.map((line, index) => (
        <li
          className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-3"
          key={index}
        >
          <strong className="font-sans text-sm font-black">
            {line.speaker}
          </strong>
          <span>
            {highlight?.sectionKey === section.key &&
            highlight.blockIndex === index
              ? highlightText(line.text, highlight.quote)
              : line.text}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Practice: a normal player per part, seek allowed, transcript on demand. */
function PracticeAudio({
  highlight,
  section,
  showTranscript,
}: {
  highlight: Props['highlight']
  section: IeltsPublicSection
  showTranscript: boolean
}) {
  const audio = section.listening?.audio
  const transcriptVisible = showTranscript || !audio

  return (
    <div className="grid gap-4">
      {audio ? (
        // Captions are the transcript toggle below.
        <AudioPlayer
          durationSec={audio.durationSec}
          key={audio.url}
          src={audio.url}
        />
      ) : (
        <p className="border-manga-black bg-manga-pale-red rounded-control border-2 p-3 text-sm font-semibold">
          This part has no audio yet. Read the transcript to practise.
        </p>
      )}
      {transcriptVisible ? (
        <Transcript
          highlight={highlight}
          section={section}
        />
      ) : null}
    </div>
  )
}

/**
 * Mock: one start button, the parts play back to back with a 30 s preview
 * before each later part, no seek and no transcript. The server re-anchors
 * the deadline at every part start; up to two interruptions extend it.
 */
function MockAudio({
  attempt,
  locked,
  onAttemptChange,
  onNotice,
  onPartChange,
  sections,
}: Pick<
  Props,
  | 'attempt'
  | 'locked'
  | 'onAttemptChange'
  | 'onNotice'
  | 'onPartChange'
  | 'sections'
>) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const startedParts = attempt.audioEvents
    .filter(event => event.kind === 'part-started')
    .map(event => (event.kind === 'part-started' ? event.part : 0))
  const [partIndex, setPartIndex] = useState(() =>
    Math.max(
      0,
      sections.findIndex(section => !startedParts.includes(section.order))
    )
  )
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [preview, setPreview] = useState(0)
  const [interruptions, setInterruptions] = useState(
    attempt.audioEvents.filter(event => event.kind === 'interrupted').length
  )
  const [stalled, setStalled] = useState(false)
  const [overCap, setOverCap] = useState(false)
  const interruptPostedRef = useRef(false)
  const [finished, setFinished] = useState(
    startedParts.length >= sections.length && sections.length > 0
  )
  const section = sections[partIndex]
  const duration = section?.listening?.audio?.durationSec ?? 0

  const post = useCallback(
    async (
      body:
        | { kind: 'part-started'; part: number }
        | { kind: 'interrupted' | 'resumed'; positionSec: number }
    ) => {
      try {
        const result = await postIeltsAudioEventApi(attempt.id, body)

        onAttemptChange(result.attempt)
      } catch {
        onNotice('Could not save the audio position. The timer keeps running.')
      }
    },
    [attempt.id, onAttemptChange, onNotice]
  )

  const playPart = useCallback(
    (index: number) => {
      const next = sections[index]
      const element = audioRef.current

      if (!next?.listening?.audio || !element) return

      element.src = next.listening.audio.url
      setPartIndex(index)
      onPartChange(next.order)
      void element.play().then(
        () => {
          setPlaying(true)
          void post({ kind: 'part-started', part: next.order })
        },
        () => onNotice('The browser blocked the audio. Press Start again.')
      )
    },
    [onNotice, onPartChange, post, sections]
  )

  // 30 s preview between parts.
  useEffect(() => {
    if (preview <= 0) return

    const id = window.setTimeout(() => {
      if (preview === 1) playPart(partIndex + 1)
      setPreview(current => current - 1)
    }, 1000)

    return () => window.clearTimeout(id)
  }, [partIndex, playPart, preview])

  const onEnded = () => {
    setPlaying(false)

    if (partIndex + 1 < sections.length) {
      onPartChange(sections[partIndex + 1].order)
      setPreview(30)
    } else {
      setFinished(true)
      onNotice('The audio has ended. Check your answers, then submit.')
    }
  }

  // Only the first two interruptions extend the deadline; a `resumed` is
  // sent only for an `interrupted` that was sent, so later stalls never use
  // up the server's event budget.
  const onWaiting = () => {
    if (!playing || stalled) return

    setStalled(true)

    if (interruptions < IELTS_MAX_AUDIO_INTERRUPTIONS) {
      interruptPostedRef.current = true
      setInterruptions(current => current + 1)
      void post({
        kind: 'interrupted',
        positionSec: audioRef.current?.currentTime ?? 0,
      })
    } else setOverCap(true)
  }

  const onPlaying = () => {
    if (!stalled) return

    setStalled(false)

    if (!interruptPostedRef.current) return

    interruptPostedRef.current = false
    void post({
      kind: 'resumed',
      positionSec: audioRef.current?.currentTime ?? 0,
    })
  }

  const resume = () => {
    void audioRef.current?.play()
  }

  const canStart = !playing && !finished && preview === 0 && !locked
  const startLabel = startedParts.length ? 'Resume audio' : 'Start audio'
  const status = finished
    ? 'Audio ended'
    : preview > 0
      ? `Preview Part ${sections[partIndex + 1]?.order}: ${preview}s`
      : playing
        ? `Playing Part ${section?.order}`
        : canStart
          ? `${startLabel}. It plays once and cannot be rewound.`
          : 'The audio plays once. You cannot rewind it.'
  const StatusIcon = finished
    ? Check
    : preview > 0
      ? Hourglass
      : playing
        ? Volume2
        : Lock

  return (
    <div className="grid gap-4">
      {/* No controls: a mock cannot seek. Transcript is hidden in mock. */}
      <audio
        onEnded={onEnded}
        onError={onWaiting}
        onPlaying={onPlaying}
        onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
        onWaiting={onWaiting}
        preload="auto"
        ref={audioRef}
      />
      <div className="border-manga-black bg-manga-paper-soft rounded-control grid gap-3 border-2 p-3">
        <div className="flex items-center gap-3">
          {canStart ? (
            // Same key as the practice player; raw because it starts a timed part.
            <button
              aria-label={startLabel}
              className={AUDIO_PLAY_BUTTON_CLASS}
              onClick={() => playPart(partIndex)}
              title={startLabel}
              type="button"
            >
              <Play
                aria-hidden="true"
                className="size-5 translate-x-px fill-current"
              />
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="border-manga-black bg-manga-white rounded-control grid size-11 shrink-0 place-items-center border-2"
            >
              <StatusIcon
                className={cn(
                  'size-5',
                  playing && 'text-manga-red animate-pulse'
                )}
              />
            </span>
          )}
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p
                aria-live="polite"
                className="min-w-0 truncate font-sans text-sm font-black"
              >
                {status}
              </p>
              <AudioClock
                duration={duration}
                time={position}
              />
            </div>
            <AudioMeter
              duration={duration}
              label="Audio progress"
              time={position}
            />
          </div>
        </div>
        {interruptions ? (
          <p className="text-manga-ink-soft text-xs font-semibold">
            Interruptions {interruptions}/{IELTS_MAX_AUDIO_INTERRUPTIONS}
          </p>
        ) : null}
        {stalled ? (
          <div
            className="bg-manga-pale-red rounded-tag grid gap-2 p-2 text-sm font-semibold"
            role="alert"
          >
            The audio was interrupted.
            {!overCap ? (
              <ExamButton
                onClick={resume}
                tone="paper"
                type="button"
              >
                Resume
              </ExamButton>
            ) : (
              <span>
                Too many interruptions. Submit your answers as they are.
              </span>
            )}
          </div>
        ) : null}
      </div>
      {section?.listening?.context ? (
        <p className={cn('text-muted-foreground text-sm font-semibold')}>
          {section.listening.context}
        </p>
      ) : null}
    </div>
  )
}

export function ListeningPane(props: Props) {
  const section =
    props.sections.find(item => item.order === props.visiblePart) ??
    props.sections[0]

  if (!section) return null

  if (props.attempt.mode === 'mock') return <MockAudio {...props} />

  return (
    <div className="mx-auto grid max-w-[68ch] gap-4">
      <header className="grid gap-1">
        <p className="text-muted-foreground font-sans text-xs font-black uppercase">
          Part {section.order}
        </p>
        <h2 className="font-sans text-xl font-black">{section.title}</h2>
        {section.listening?.context ? (
          <p className="font-semibold">{section.listening.context}</p>
        ) : null}
      </header>
      <PracticeAudio
        highlight={props.highlight}
        section={section}
        showTranscript={props.showTranscript}
      />
    </div>
  )
}
