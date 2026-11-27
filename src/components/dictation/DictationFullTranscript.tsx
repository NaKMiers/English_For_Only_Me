'use client'

import { useEffect, useRef } from 'react'

import { MoveVertical, Play, Repeat } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { DictationSegmentAttemptStatus } from '@/modules/dictation/types'

/** What the list renders: the learner's own status, never shared progress. */
export interface FullTranscriptSegment {
  attemptStatus: DictationSegmentAttemptStatus
  id: string
  startMs: number | null
  text: string
}

interface Props<TSegment extends FullTranscriptSegment> {
  autoScroll: boolean
  canRepeat: boolean
  currentSegmentId: string | null
  // Lets a height-bound ancestor (the practice shell's side-by-side layout)
  // stretch the list to fill it instead of capping at max-h-128.
  fillAvailableHeight?: boolean
  isActive: boolean
  isRepeating: boolean
  onSelectSegment: (segment: TSegment) => void
  onToggleAutoScroll: () => void
  onToggleRepeat: () => void
  playingSegmentId: string | null
  segments: TSegment[]
  // segmentId -> translated caption in the selected language (bilingual view).
  translations?: Record<string, string>
}

const STATUS_META: Record<
  DictationSegmentAttemptStatus,
  { className: string; label: string } | null
> = {
  attemptedIncorrect: {
    className: 'border-accent-orange bg-pastel-peach text-accent-orange',
    label: 'Retry',
  },
  correct: {
    className: 'border-lesson-correct bg-lesson-correct/10 text-lesson-correct',
    label: 'Correct',
  },
  notStarted: null,
  revealed: {
    className: 'border-accent-blue bg-pastel-sky text-accent-blue',
    label: 'Revealed',
  },
  skipped: {
    className: 'border-danger bg-danger-soft text-danger',
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

export function DictationFullTranscript<
  TSegment extends FullTranscriptSegment,
>({
  autoScroll,
  canRepeat,
  currentSegmentId,
  fillAvailableHeight = false,
  isActive,
  isRepeating,
  onSelectSegment,
  onToggleAutoScroll,
  onToggleRepeat,
  playingSegmentId,
  segments,
  translations,
}: Props<TSegment>) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null)
  const highlightedId = playingSegmentId ?? currentSegmentId

  // Auto-scroll follows the active caption only when enabled; manual scrolling
  // is always available since the list is its own overflow container.
  useEffect(() => {
    if (!isActive || !autoScroll) return

    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [autoScroll, highlightedId, isActive])

  return (
    <section
      aria-label="Full transcript"
      className="border-line bg-surface rounded-panel grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2 border p-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-sm leading-tight font-semibold tracking-normal">
          Full transcript
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={isRepeating}
            disabled={!canRepeat}
            onClick={onToggleRepeat}
            className={cn(
              'border-line rounded-control inline-flex min-h-8 items-center gap-1.5 border px-2 font-sans text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50',
              isRepeating
                ? 'bg-cta text-cta-fg'
                : 'bg-surface text-ink hover:bg-tint'
            )}
          >
            <Repeat
              aria-hidden="true"
              className="size-4"
            />
            Repeat
          </button>
          <button
            type="button"
            aria-pressed={autoScroll}
            onClick={onToggleAutoScroll}
            className={cn(
              'border-line rounded-control inline-flex min-h-8 items-center gap-1.5 border px-2 font-sans text-xs font-semibold',
              autoScroll
                ? 'bg-cta text-cta-fg'
                : 'bg-surface text-ink hover:bg-tint'
            )}
          >
            <MoveVertical
              aria-hidden="true"
              className="size-4"
            />
            Auto scroll
          </button>
          <span className="text-ink-soft text-xs font-normal">
            {segments.length} sentences
          </span>
        </div>
      </div>

      {/* Bounded by default so the list scrolls within itself; fillAvailableHeight
          opts into stretching to a height-bound ancestor instead (practice shell). */}
      <ol
        className={cn(
          'grid max-h-128 min-h-0 min-w-0 snap-y snap-proximity auto-rows-max gap-1 overflow-y-auto pr-1',
          fillAvailableHeight && 'lg:max-h-none'
        )}
      >
        {segments.map((segment, index) => {
          const isHighlighted = segment.id === highlightedId
          const statusMeta = STATUS_META[segment.attemptStatus]
          const timestamp = formatTimestamp(segment.startMs)
          const translation = translations?.[segment.id]?.trim()

          return (
            <li
              key={segment.id}
              className="snap-start"
            >
              <button
                ref={isHighlighted ? activeItemRef : null}
                type="button"
                onClick={() => onSelectSegment(segment)}
                aria-current={isHighlighted ? 'true' : undefined}
                className={cn(
                  'border-line rounded-control grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 border p-1.5 text-left transition-colors',
                  isHighlighted ? 'bg-tint-soft' : 'bg-surface hover:bg-tint'
                )}
              >
                <span className="border-line bg-surface text-ink rounded-tag mt-0.5 grid size-6 place-items-center border text-xs font-semibold">
                  {isHighlighted ? (
                    <Play
                      aria-hidden="true"
                      className="text-brand size-3"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                {/* Timestamp and status ride inline with the sentence instead of
                    owning a meta line above it: at 56 captions that line was
                    costing a third of the list's height for two short chips. */}
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-ink min-w-0 text-base leading-6 font-semibold wrap-break-word">
                    {timestamp ? (
                      <span className="text-ink-soft mr-1.5 text-[0.65rem] font-normal tabular-nums">
                        {timestamp}
                      </span>
                    ) : null}
                    {statusMeta ? (
                      <span
                        className={cn(
                          'rounded-tag mr-1.5 inline-block border px-1 text-[0.6rem] leading-4 font-semibold',
                          statusMeta.className
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    ) : null}
                    {segment.text}
                  </span>
                  {translation ? (
                    <span className="text-brand border-line/30 min-w-0 border-l pl-1.5 text-sm leading-5 font-semibold wrap-break-word italic">
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
