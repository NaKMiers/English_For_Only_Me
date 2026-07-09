'use client'

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCcw,
  SkipBack,
} from 'lucide-react'
import { useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  ANSWER_TEXT_SIZE_LABEL,
  ANSWER_TEXT_SIZE_OPTIONS,
  PLAYBACK_SPEED_OPTIONS,
  type AnswerTextSize,
} from '@/modules/dictation/preferences/dictationPreferences'

interface Props {
  answerTextSize: AnswerTextSize
  canGoNext: boolean
  canGoPrevious: boolean
  canReplay: boolean
  currentIndex: number
  isVideoHidden: boolean
  onAnswerTextSizeChange: (size: AnswerTextSize) => void
  onGoNext: () => void
  onGoPrevious: () => void
  onGoToFirstSegment: () => void
  onReplay: () => void
  onRestart: () => void
  onSpeedChange: (speed: number) => void
  onToggleVideo: () => void
  playbackSpeed: number
  totalSegments: number
}

export function DictationControls({
  answerTextSize,
  canGoNext,
  canGoPrevious,
  canReplay,
  currentIndex,
  isVideoHidden,
  onAnswerTextSizeChange,
  onGoNext,
  onGoPrevious,
  onGoToFirstSegment,
  onReplay,
  onRestart,
  onSpeedChange,
  onToggleVideo,
  playbackSpeed,
  totalSegments,
}: Props) {
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false)

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
          label="Rewind to first segment"
          onClick={onGoToFirstSegment}
          className="size-10 border-2 shadow-[2px_2px_0_var(--manga-black)]"
        >
          <SkipBack
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
              'border-manga-black min-h-9 border-2 px-3 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)]',
              playbackSpeed === speed
                ? 'bg-manga-black text-manga-white'
                : 'bg-manga-white text-manga-black hover:bg-manga-paper-soft'
            )}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <span className="text-manga-ink-soft text-xs font-black uppercase">
          Text
        </span>
        {ANSWER_TEXT_SIZE_OPTIONS.map(size => (
          <button
            key={size}
            type="button"
            aria-pressed={answerTextSize === size}
            onClick={() => onAnswerTextSizeChange(size)}
            className={cn(
              'border-manga-black min-h-9 border-2 px-3 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)]',
              answerTextSize === size
                ? 'bg-manga-black text-manga-white'
                : 'bg-manga-white text-manga-black hover:bg-manga-paper-soft'
            )}
          >
            {ANSWER_TEXT_SIZE_LABEL[size]}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <IconButton
          label="Restart progress"
          onClick={() => setIsRestartConfirmOpen(true)}
          className="size-10 border-2 shadow-[2px_2px_0_var(--manga-black)]"
        >
          <RefreshCw
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
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

      <Dialog
        open={isRestartConfirmOpen}
        onOpenChange={setIsRestartConfirmOpen}
      >
        <DialogContent className="border-manga-black bg-manga-white rounded-none border-3 shadow-[6px_6px_0_var(--manga-black)]">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl leading-tight font-black tracking-normal uppercase">
              Restart this exercise?
            </DialogTitle>
            <DialogDescription className="text-manga-ink-soft text-base leading-7 font-semibold">
              This clears your typed answers and takes you back to the first
              segment. Your saved accuracy stats stay untouched.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="bg-manga-paper-soft border-manga-black rounded-none border-t-3">
            <MangaButton
              type="button"
              tone="paper"
              onClick={() => setIsRestartConfirmOpen(false)}
            >
              Cancel
            </MangaButton>
            <MangaButton
              type="button"
              onClick={() => {
                setIsRestartConfirmOpen(false)
                onRestart()
              }}
            >
              Restart
            </MangaButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
