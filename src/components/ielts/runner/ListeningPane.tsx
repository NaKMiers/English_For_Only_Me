'use client'

import { Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_MAX_AUDIO_INTERRUPTIONS } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { postIeltsAudioEventApi } from '@/requests/ieltsApi'

import { highlightText, type IeltsHighlight } from './PassagePane'
import { formatClock } from './useMockDeadline'
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
      className="font-body grid gap-2 text-[17px] leading-[1.7]"
    >
      {lines.map((line, index) => (
        <li
          className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-3"
          key={index}
        >
          <strong className="font-sans text-sm font-bold">
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
        <audio
          className="w-full"
          controls
          key={audio.url}
          preload="metadata"
          src={audio.url}
        />
      ) : (
        <p className="border-ex-line bg-ex-soft rounded-lg border p-3 text-sm font-semibold">
          Phần này chưa có audio. Đọc transcript để luyện.
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
        onNotice('Không ghi được thời điểm audio. Đồng hồ vẫn chạy.')
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
        () => onNotice('Trình duyệt chặn phát audio. Bấm Bắt đầu lại.')
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
      onNotice('Audio đã hết. Kiểm tra lại đáp án rồi nộp bài.')
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
      <div className="border-ex-line grid gap-3 rounded-lg border bg-white p-4">
        <p className="font-sans text-sm font-bold">
          {finished
            ? 'Audio đã hết'
            : preview > 0
              ? `Xem trước Part ${sections[partIndex + 1]?.order}: ${preview}s`
              : playing
                ? `Đang phát Part ${section?.order}`
                : 'Audio phát một lần, không tua được.'}
        </p>
        <Progress value={duration ? (position / duration) * 100 : 0} />
        <p className="text-ex-muted text-xs font-semibold tabular-nums">
          {formatClock(Math.floor(position))} /{' '}
          {formatClock(Math.floor(duration))}
          {interruptions
            ? ` · Gián đoạn ${interruptions}/${IELTS_MAX_AUDIO_INTERRUPTIONS}`
            : ''}
        </p>
        {!playing && !finished && preview === 0 && !locked ? (
          <ExamButton
            icon={
              <Play
                aria-hidden="true"
                className="size-4"
              />
            }
            onClick={() => playPart(partIndex)}
            tone="ink"
            type="button"
          >
            {startedParts.length ? 'Tiếp tục audio' : 'Bắt đầu'}
          </ExamButton>
        ) : null}
        {stalled ? (
          <div
            className="bg-ex-soft grid gap-2 rounded-md p-2 text-sm font-semibold"
            role="alert"
          >
            Audio bị gián đoạn.
            {!overCap ? (
              <ExamButton
                onClick={resume}
                tone="paper"
                type="button"
              >
                Tiếp tục
              </ExamButton>
            ) : (
              <span>Đã quá số lần gián đoạn. Nộp bài như hiện tại.</span>
            )}
          </div>
        ) : null}
      </div>
      {section?.listening?.context ? (
        <p className={cn('text-ex-muted text-sm font-semibold')}>
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
        <p className="text-ex-muted font-sans text-xs font-bold uppercase">
          Part {section.order}
        </p>
        <h2 className="font-sans text-xl font-bold">{section.title}</h2>
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
