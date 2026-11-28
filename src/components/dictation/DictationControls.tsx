'use client'

import { ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  DictationSettingsMenu,
  type PracticeToggles,
} from '@/components/dictation/DictationSettingsMenu'
import { IconButton } from '@/components/ui/IconButton'
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
  isVideoHidden: boolean
  onAnswerTextSizeChange: (size: AnswerTextSize) => void
  onGoNext: () => void
  onGoPrevious: () => void
  onGoToFirstSegment: () => void
  onReplay: () => void
  onRestart: () => void
  onSpeedChange: (speed: number) => void
  onToggleChange: (key: keyof PracticeToggles, value: boolean) => void
  onToggleVideo: () => void
  onVideoSizeChange: (size: VideoSize) => void
  playbackSpeed: number
  toggles: PracticeToggles
  videoSize: VideoSize
}

// 44px: the strip is touched with a thumb on phones.
const ICON_BUTTON_CLASS_NAME = 'border'

export function DictationControls({
  answerTextSize,
  canGoNext,
  canGoPrevious,
  canReplay,
  isVideoHidden,
  onAnswerTextSizeChange,
  onGoNext,
  onGoPrevious,
  onGoToFirstSegment,
  onReplay,
  onRestart,
  onSpeedChange,
  onToggleChange,
  onToggleVideo,
  onVideoSizeChange,
  playbackSpeed,
  toggles,
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
          onRestart={() => setIsRestartConfirmOpen(true)}
          onRewind={onGoToFirstSegment}
          onToggleChange={onToggleChange}
          onVideoSizeChange={onVideoSizeChange}
          playbackSpeed={playbackSpeed}
          toggles={toggles}
          videoSize={videoSize}
        />
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

      <ConfirmDialog
        cancelLabel={t.common.actions.cancel}
        confirmLabel={text.restartConfirm}
        description={text.restartDescription}
        onConfirm={onRestart}
        onOpenChange={setIsRestartConfirmOpen}
        open={isRestartConfirmOpen}
        title={text.restartTitle}
      />
    </div>
  )
}
