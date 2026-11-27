'use client'

import {
  Check,
  ChevronDown,
  Hourglass,
  Lock,
  Play,
  Volume2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AUDIO_PLAY_BUTTON_CLASS,
  AudioClock,
  AudioMeter,
  AudioPlayer,
} from '@/components/common/AudioPlayer'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_MAX_AUDIO_INTERRUPTIONS } from '@/modules/ielts/constants'
import { contextReadAloud } from '@/modules/ielts/listeningContext'
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
  onShowTranscriptChange: (open: boolean) => void
  sections: IeltsPublicSection[]
  showTranscript: boolean
  visiblePart: number
}

function Transcript({
  highlight,
  lineNumbers = false,
  section,
}: {
  highlight: Props['highlight']
  /** Admin preview: each line's index, which evidence `blockIndex` uses. */
  lineNumbers?: boolean
  section: IeltsPublicSection
}) {
  const t = useMessages().ielts.listening
  const lines = section.listening?.lines
  const rootRef = useRef<HTMLOListElement>(null)
  const evidence = highlight?.sectionKey === section.key ? highlight : null

  // "Show evidence" lands on the quoted line, as the passage does.
  useEffect(() => {
    if (!evidence) return

    rootRef.current
      ?.querySelector('[data-ielts-evidence]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [evidence])

  if (!lines?.length) return null

  return (
    <ol
      aria-label={t.transcript}
      data-highlight-scope={`transcript:${section.key}`}
      className="font-body grid gap-2.5 text-[15px] leading-[1.6]"
      ref={rootRef}
    >
      {lines.map((line, index) => (
        <li key={index}>
          {lineNumbers ? (
            <span className="text-muted-foreground mr-1.5 font-sans text-xs tabular-nums">
              {index}
            </span>
          ) : null}
          <strong className="font-sans font-semibold">{line.speaker}:</strong>{' '}
          <span>
            {evidence?.blockIndex === index
              ? highlightText(line.text, evidence.quote)
              : line.text}
          </span>
        </li>
      ))}
    </ol>
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
  const t = useMessages().ielts.listening
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
        onNotice(t.positionFailed)
      }
    },
    [attempt.id, onAttemptChange, onNotice, t]
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
        () => onNotice(t.blocked)
      )
    },
    [onNotice, onPartChange, post, sections, t]
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
      onNotice(t.ended)
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
  const startLabel = startedParts.length ? t.resumeAudio : t.startAudio
  const status = finished
    ? t.statusEnded
    : preview > 0
      ? format(t.preview, {
          part: sections[partIndex + 1]?.order ?? '',
          seconds: preview,
        })
      : playing
        ? format(t.playing, { part: section?.order ?? '' })
        : canStart
          ? format(t.startHint, { label: startLabel })
          : t.playsOnce
  const StatusIcon = finished
    ? Check
    : preview > 0
      ? Hourglass
      : playing
        ? Volume2
        : Lock

  return (
    <div className="grid gap-2">
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
      <div className="border-line bg-tint rounded-control grid gap-3 border p-3">
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
              className="border-line bg-surface rounded-control grid size-11 shrink-0 place-items-center border"
            >
              <StatusIcon
                className={cn('size-5', playing && 'text-brand animate-pulse')}
              />
            </span>
          )}
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p
                aria-live="polite"
                className="min-w-0 truncate font-sans text-sm font-semibold"
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
              label={t.progress}
              time={position}
            />
          </div>
        </div>
        {interruptions ? (
          <p className="text-ink-soft text-xs font-normal">
            {format(t.interruptions, {
              count: interruptions,
              max: IELTS_MAX_AUDIO_INTERRUPTIONS,
            })}
          </p>
        ) : null}
        {stalled ? (
          <div
            className="bg-tint-soft rounded-tag grid gap-2 p-2 text-sm font-semibold"
            role="alert"
          >
            {t.interrupted}
            {!overCap ? (
              <ExamButton
                onClick={resume}
                tone="paper"
                type="button"
              >
                {t.resume}
              </ExamButton>
            ) : (
              <span>{t.tooMany}</span>
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

function visibleSection(
  props: Pick<Props, 'sections' | 'visiblePart'>
): IeltsPublicSection | undefined {
  return (
    props.sections.find(item => item.order === props.visiblePart) ??
    props.sections[0]
  )
}

/**
 * The audio bar the runner pins above the scrolling transcript and
 * questions. Practice: a normal player per part, seek allowed. Mock: the
 * play-once controls.
 */
export function ListeningPlayer(props: Props) {
  const t = useMessages().ielts.listening
  const section = visibleSection(props)

  if (!section) return null

  if (props.attempt.mode === 'mock') return <MockAudio {...props} />

  const audio = section.listening?.audio

  return audio ? (
    // The runner's bar is the frame, so the player drops its own box.
    <AudioPlayer
      className="border-0 bg-transparent p-0"
      durationSec={audio.durationSec}
      key={audio.url}
      shortcuts
      src={audio.url}
    />
  ) : (
    <p className="border-line bg-tint-soft rounded-control border p-2 text-sm font-semibold">
      {t.noAudio}
    </p>
  )
}

/**
 * A listening part as the paper shows it: PART N, the context unless the
 * script reads it aloud, and the audioscript headed by the part title. A
 * part without audio always shows its script. Shared by the runner
 * (practice) and the admin preview.
 */
export function ListeningPart({
  highlight,
  lineNumbers = false,
  onShowTranscriptChange,
  section,
  showTranscript,
}: {
  highlight: Props['highlight']
  lineNumbers?: boolean
  onShowTranscriptChange: (open: boolean) => void
  section: IeltsPublicSection
  showTranscript: boolean
}) {
  const t = useMessages().ielts.listening
  const hasLines = Boolean(section.listening?.lines?.length)
  const context = section.listening?.context ?? ''
  // The announcer reads the context aloud, so the audioscript repeats it.
  const contextInScript = contextReadAloud(section.listening)

  const title = (
    <h3 className="text-center font-sans text-xl leading-tight font-semibold">
      {section.title}
    </h3>
  )
  const script = (
    <Transcript
      highlight={highlight}
      lineNumbers={lineNumbers}
      section={section}
    />
  )

  return (
    <div className="grid w-full gap-3">
      <header className="grid gap-2">
        <h2 className="text-muted-foreground font-sans text-lg leading-none font-semibold tracking-wide">
          Part {section.order}
        </h2>
        {/* With an audioscript the title heads the script, as on Jumpinto. */}
        {hasLines ? null : title}
        {context && !contextInScript ? (
          <p className="font-semibold">{context}</p>
        ) : null}
      </header>
      {!section.listening?.audio ? (
        <div className="grid gap-3">
          {hasLines ? title : null}
          {script}
        </div>
      ) : hasLines ? (
        <Collapsible
          className="border-exam-line grid gap-3 border-t"
          onOpenChange={onShowTranscriptChange}
          open={showTranscript}
        >
          <CollapsibleTrigger className="group/transcript flex min-h-11 w-full items-center justify-between gap-2 font-sans text-sm font-semibold focus-visible:underline focus-visible:ring-0">
            {t.audioscript}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-data-[panel-open]/transcript:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsiblePanel className="grid gap-3">
            {title}
            {script}
          </CollapsiblePanel>
        </Collapsible>
      ) : null}
    </div>
  )
}

/**
 * Practice only: the part header and the audioscript. Mock has neither (the
 * audio bar carries the part context).
 */
export function ListeningMaterial(
  props: Pick<
    Props,
    | 'attempt'
    | 'highlight'
    | 'onShowTranscriptChange'
    | 'sections'
    | 'showTranscript'
    | 'visiblePart'
  >
) {
  const section = visibleSection(props)

  if (!section || props.attempt.mode === 'mock') return null

  return (
    <ListeningPart
      highlight={props.highlight}
      onShowTranscriptChange={props.onShowTranscriptChange}
      section={section}
      showTranscript={props.showTranscript}
    />
  )
}
