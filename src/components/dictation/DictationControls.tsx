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
import { ActionButton } from '@/components/ui/ActionButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMessages } from '@/i18n/client'
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

const ICON_BUTTON_CLASS_NAME = 'size-9 border'

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
  const t = useMessages()
  const text = t.dictation.controls
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false)

  return (
    // One dense strip, everything flush left: transport first, then the session
    // actions. It shares its row with the view tabs (pushed right by the
    // caller), and speed / answer text / video size live behind the settings
    // menu so the strip never wraps to a second line.
    <div className="border-line bg-surface rounded-control flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border px-2 py-1.5 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none!">
      <div className="flex min-w-0 items-center gap-1">
        <IconButton
          label={text.replay}
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
          label={text.rewind}
          onClick={onGoToFirstSegment}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <SkipBack
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
        <IconButton
          label={text.previous}
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
          aria-label={text.current}
          className="border-line bg-tint rounded-control inline-flex min-h-8 items-center border px-2 font-sans text-xs font-semibold tabular-nums"
        >
          {currentIndex + 1} / {totalSegments}
        </span>
        <IconButton
          label={text.next}
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
          label={text.restart}
          onClick={() => setIsRestartConfirmOpen(true)}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <RefreshCw
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
        <IconButton
          label={isVideoHidden ? text.showVideo : text.hideVideo}
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
        <DialogContent className="border-line bg-surface rounded-panel border">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl leading-tight font-semibold tracking-normal">
              {text.restartTitle}
            </DialogTitle>
            <DialogDescription className="text-ink-soft text-base leading-7 font-normal">
              {text.restartDescription}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="bg-tint border-line border-t">
            <ActionButton
              type="button"
              tone="paper"
              onClick={() => setIsRestartConfirmOpen(false)}
            >
              {t.common.actions.cancel}
            </ActionButton>
            <ActionButton
              type="button"
              onClick={() => {
                setIsRestartConfirmOpen(false)
                onRestart()
              }}
            >
              {text.restartConfirm}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
