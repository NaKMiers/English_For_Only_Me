'use client'

import { ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from 'lucide-react'

import { IconButton } from '@/components/ui/IconButton'
import { MangaButton } from '@/components/ui/MangaButton'
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
  isVideoHidden,
  onGoNext,
  onGoPrevious,
  onReplay,
  onSpeedChange,
  onToggleVideo,
  playbackSpeed,
  replayMessage,
  showShortcuts,
  totalSegments,
}: Props) {
  return (
    <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)]">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <IconButton
          label="Previous segment"
          disabled={!canGoPrevious}
          onClick={onGoPrevious}
        >
          <ChevronLeft
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <span
          aria-label="Current segment"
          className="border-manga-black bg-manga-paper-soft min-h-11 border-3 px-4 py-2 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]"
        >
          {currentIndex + 1} / {totalSegments}
        </span>
        <IconButton
          label="Next segment"
          disabled={!canGoNext}
          onClick={onGoNext}
        >
          <ChevronRight
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
        <MangaButton
          type="button"
          disabled={!canReplay}
          onClick={onReplay}
          icon={
            <RotateCcw
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Replay
        </MangaButton>
        <MangaButton
          type="button"
          tone="paper"
          onClick={onToggleVideo}
          icon={
            isVideoHidden ? (
              <Eye
                aria-hidden="true"
                className="size-5"
              />
            ) : (
              <EyeOff
                aria-hidden="true"
                className="size-5"
              />
            )
          }
        >
          {isVideoHidden ? 'Show Video' : 'Hide Video'}
        </MangaButton>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              'border-manga-black min-h-10 border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]',
              playbackSpeed === speed
                ? 'bg-manga-black text-manga-white'
                : 'bg-manga-white text-manga-black hover:bg-manga-paper-soft'
            )}
          >
            {speed}x
          </button>
        ))}
        <span
          role="status"
          className="text-manga-ink-soft min-w-0 text-sm leading-6 font-semibold break-words"
        >
          {replayMessage}
        </span>
      </div>

      {showShortcuts ? (
        <div className="text-manga-ink-soft flex flex-wrap gap-2 text-xs font-black">
          <span>Ctrl + Space replay</span>
          <span>Enter check</span>
          <span>Alt + arrows move</span>
          <span>Alt + V video</span>
        </div>
      ) : null}
    </div>
  )
}
