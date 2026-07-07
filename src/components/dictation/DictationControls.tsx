'use client'

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/utils'
import { PLAYBACK_SPEED_OPTIONS } from '@/modules/dictation/preferences/dictationPreferences'

interface Props {
  canGoNext: boolean
  canGoPrevious: boolean
  canReplay: boolean
  currentIndex: number
  isVideoHidden: boolean
  onGoNext: () => void
  onGoPrevious: () => void
  onReplay: () => void
  onSpeedChange: (speed: number) => void
  onToggleVideo: () => void
  playbackSpeed: number
  replayMessage: string
  showShortcuts: boolean
  totalSegments: number
}

export function DictationControls({
  canGoNext,
  canGoPrevious,
  canReplay,
  currentIndex,
  isVideoHidden: _isVideoHidden,
  onGoNext,
  onGoPrevious,
  onReplay,
  onSpeedChange,
  onToggleVideo: _onToggleVideo,
  playbackSpeed,
  replayMessage,
  showShortcuts,
  totalSegments,
}: Props) {
  return (
    <div className="border-manga-black bg-manga-white flex min-w-0 flex-wrap items-center gap-2 border-2 p-2 shadow-[3px_3px_0_var(--manga-black)]">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          label="Replay current sentence"
          disabled={!canReplay}
          onClick={onReplay}
          className="size-10 border-2 shadow-[2px_2px_0_var(--manga-black)]"
        >
          <RotateCcw
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <IconButton
          label="Previous segment"
          disabled={!canGoPrevious}
          onClick={onGoPrevious}
          className="size-10 border-2 shadow-[2px_2px_0_var(--manga-black)]"
        >
          <ChevronLeft
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <span
          aria-label="Current segment"
          className="border-manga-black bg-manga-paper-soft inline-flex min-h-10 items-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
        >
          {currentIndex + 1} / {totalSegments}
        </span>
        <IconButton
          label="Next segment"
          disabled={!canGoNext}
          onClick={onGoNext}
          className="size-10 border-2 shadow-[2px_2px_0_var(--manga-black)]"
        >
          <ChevronRight
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <span className="text-manga-ink-soft text-xs font-black uppercase">
          Speed
        </span>
        {PLAYBACK_SPEED_OPTIONS.map(speed => (
          <button
            key={speed}
            type="button"
            aria-pressed={playbackSpeed === speed}
            onClick={() => onSpeedChange(speed)}
            className={cn(
              'border-manga-black min-h-9 border-2 px-2 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)]',
              playbackSpeed === speed
                ? 'bg-manga-black text-manga-white'
                : 'bg-manga-white text-manga-black hover:bg-manga-paper-soft'
            )}
          >
            {speed}x
          </button>
        ))}
      </div>

      <span
        role="status"
        className="text-manga-ink-soft min-w-48 flex-1 text-sm leading-5 font-semibold wrap-break-word"
      >
        {replayMessage}
      </span>

      {showShortcuts ? (
        <div className="text-manga-ink-soft flex flex-wrap gap-2 text-xs font-black">
          <span>Ctrl replay</span>
          <span>Enter check</span>
          <span>Alt arrows move</span>
        </div>
      ) : null}
    </div>
  )
}
