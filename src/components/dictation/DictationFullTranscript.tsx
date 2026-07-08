'use client'

import { useEffect, useRef } from 'react'

import { Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import type {
  DictationSegmentApiRecord,
  DictationSegmentAttemptStatus,
} from '@/modules/dictation/types'

interface Props {
  currentSegmentId: string | null
  isActive: boolean
  onSelectSegment: (segment: DictationSegmentApiRecord) => void
  playingSegmentId: string | null
  segments: DictationSegmentApiRecord[]
  // segmentId -> translated caption in the selected language (bilingual view).
  translations?: Record<string, string>
}

const STATUS_META: Record<
  DictationSegmentAttemptStatus,
  { className: string; label: string } | null
> = {
  attemptedIncorrect: {
    className: 'border-amber-700 bg-amber-50 text-amber-900',
    label: 'Retry',
  },
  correct: {
    className: 'border-emerald-700 bg-emerald-50 text-emerald-800',
    label: 'Correct',
  },
  notStarted: null,
  revealed: {
    className: 'border-sky-700 bg-sky-50 text-sky-900',
    label: 'Revealed',
  },
  skipped: {
    className: 'border-manga-red bg-manga-pale-red text-manga-red',
    label: 'Skipped',
  },
}

function formatTimestamp(ms: number | null) {
  if (ms === null) return null

  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function DictationFullTranscript({
  currentSegmentId,
  isActive,
  onSelectSegment,
  playingSegmentId,
  segments,
  translations,
}: Props) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null)
  const highlightedId = playingSegmentId ?? currentSegmentId

  useEffect(() => {
    if (!isActive) return

    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [highlightedId, isActive])

  return (
    <section
      aria-label="Full transcript"
      className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-lg leading-tight font-black tracking-normal">
          Full transcript
        </h2>
        <span className="text-manga-ink-soft text-xs font-black uppercase">
          {segments.length} sentences
        </span>
      </div>

      <ol className="grid max-h-128 min-w-0 gap-2 overflow-y-auto pr-1">
        {segments.map((segment, index) => {
          const isHighlighted = segment.id === highlightedId
          const statusMeta = STATUS_META[segment.attemptStatus]
          const timestamp = formatTimestamp(segment.startMs)
          const translation = translations?.[segment.id]?.trim()

          return (
            <li key={segment.id}>
              <button
                ref={isHighlighted ? activeItemRef : null}
                type="button"
                onClick={() => onSelectSegment(segment)}
                aria-current={isHighlighted ? 'true' : undefined}
                className={cn(
                  'border-manga-black grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-2 p-2 text-left shadow-[2px_2px_0_var(--manga-black)] transition-colors',
                  isHighlighted
                    ? 'bg-manga-pale-red'
                    : 'bg-manga-white hover:bg-manga-paper-soft'
                )}
              >
                <span className="border-manga-black bg-manga-white text-manga-black grid size-7 place-items-center border-2 text-xs font-black">
                  {isHighlighted ? (
                    <Play
                      aria-hidden="true"
                      className="text-manga-red size-3.5"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {timestamp ? (
                      <span className="text-manga-ink-soft text-xs font-black tabular-nums">
                        {timestamp}
                      </span>
                    ) : null}
                    {statusMeta ? (
                      <span
                        className={cn(
                          'rounded-none border-2 px-1.5 py-0.5 text-[0.65rem] font-black uppercase',
                          statusMeta.className
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-manga-black min-w-0 text-base leading-6 font-semibold wrap-break-word">
                    {segment.text}
                  </span>
                  {translation ? (
                    <span className="text-manga-red border-manga-black/30 min-w-0 border-l-2 pl-2 text-sm leading-6 font-semibold wrap-break-word italic">
                      {translation}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
