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

import { DictationSettingsMenu } from '@/components/dictation/DictationSettingsMenu'
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
import type {
  AnswerTextSize,
  VideoSize,
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
  onVideoSizeChange: (size: VideoSize) => void
  playbackSpeed: number
  totalSegments: number
  videoSize: VideoSize
}

const ICON_BUTTON_CLASS_NAME =
  'size-9 border-2 shadow-[2px_2px_0_var(--manga-black)]'

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
  onVideoSizeChange,
  playbackSpeed,
  totalSegments,
  videoSize,
}: Props) {
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false)

  return (
    // One dense strip, everything flush left: transport first, then the session
    // actions. It shares its row with the view tabs (pushed right by the
    // caller), and speed / answer text / video size live behind the settings
    // menu so the strip never wraps to a second line.
    <div className="border-manga-black bg-manga-white flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-2 px-2 py-1.5 shadow-[3px_3px_0_var(--manga-black)]">
      <div className="flex min-w-0 items-center gap-1">
        <IconButton
          label="Replay current sentence"
          disabled={!canReplay}
          onClick={onReplay}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <RotateCcw
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
        <IconButton
          label="Rewind to first segment"
          onClick={onGoToFirstSegment}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <SkipBack
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
        <IconButton
          label="Previous segment"
          disabled={!canGoPrevious}
          onClick={onGoPrevious}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <ChevronLeft
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
        <span
          aria-label="Current segment"
          className="border-manga-black bg-manga-paper-soft inline-flex min-h-8 items-center border-2 px-2 font-sans text-xs font-black tabular-nums shadow-[2px_2px_0_var(--manga-black)]"
        >
          {currentIndex + 1} / {totalSegments}
        </span>
        <IconButton
          label="Next segment"
          disabled={!canGoNext}
          onClick={onGoNext}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <ChevronRight
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
      </div>

      <div className="flex items-center gap-1">
        <DictationSettingsMenu
          answerTextSize={answerTextSize}
          onAnswerTextSizeChange={onAnswerTextSizeChange}
          onPlaybackSpeedChange={onSpeedChange}
          onVideoSizeChange={onVideoSizeChange}
          playbackSpeed={playbackSpeed}
          videoSize={videoSize}
        />
        <IconButton
          label="Restart progress"
          onClick={() => setIsRestartConfirmOpen(true)}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <RefreshCw
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
        <IconButton
          label={isVideoHidden ? 'Show video' : 'Hide video'}
          onClick={onToggleVideo}
          className={ICON_BUTTON_CLASS_NAME}
        >
          {isVideoHidden ? (
            <Eye
              aria-hidden="true"
              className="size-4"
            />
          ) : (
            <EyeOff
              aria-hidden="true"
              className="size-4"
            />
          )}
        </IconButton>
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
