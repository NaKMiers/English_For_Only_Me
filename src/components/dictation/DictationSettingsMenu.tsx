'use client'

import { ChevronDown, SlidersHorizontal } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ANSWER_TEXT_SIZE_OPTIONS,
  PLAYBACK_SPEED_OPTIONS,
  VIDEO_SIZE_OPTIONS,
  type AnswerTextSize,
  type VideoSize,
} from '@/modules/dictation/preferences/dictationPreferences'

interface Props {
  answerTextSize: AnswerTextSize
  onAnswerTextSizeChange: (size: AnswerTextSize) => void
  onPlaybackSpeedChange: (speed: number) => void
  onVideoSizeChange: (size: VideoSize) => void
  playbackSpeed: number
  videoSize: VideoSize
}

const VIDEO_SIZE_LABEL: Record<VideoSize, string> = {
  small: 'Small',
  normal: 'Normal',
  large: 'Large',
  max: 'Max',
}

// Spelled out rather than the toolbar's S/M/L/XL: a menu row has the width for
// a real word, and a bare "XL" on its own line reads like a shirt size.
const ANSWER_TEXT_MENU_LABEL: Record<AnswerTextSize, string> = {
  small: 'Small',
  normal: 'Medium',
  large: 'Large',
  xlarge: 'Extra large',
}

const GROUP_LABEL_CLASS_NAME =
  'text-manga-ink-soft px-3 pt-1 font-sans text-[0.65rem] font-black uppercase'

const RADIO_ITEM_CLASS_NAME =
  'focus:bg-manga-paper-soft data-checked:bg-manga-paper-soft min-h-9 rounded-none py-1 pr-8 pl-3 font-sans text-xs font-black'

/**
 * Playback speed, answer text size, and video size behind one popover.
 *
 * These are set-once-then-forget preferences, so fourteen pills on the toolbar
 * were spending a row of a height-locked screen on controls the learner touches
 * a couple of times per exercise. Radio items (not plain buttons) keep the popup
 * keyboard-navigable, and base-ui leaves it open on select, so picking a speed
 * and then a text size is one trip.
 */
export function DictationSettingsMenu({
  answerTextSize,
  onAnswerTextSizeChange,
  onPlaybackSpeedChange,
  onVideoSizeChange,
  playbackSpeed,
  videoSize,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Playback and display settings"
        title="Playback and display settings"
        className="border-manga-black bg-manga-white text-manga-black hover:bg-manga-paper-soft inline-flex min-h-9 shrink-0 items-center gap-1 border-2 px-2 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)] transition-colors"
      >
        <SlidersHorizontal
          aria-hidden="true"
          className="size-4"
        />
        <span className="tabular-nums">{playbackSpeed}x</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {/* Each label lives INSIDE its radio group: Menu.GroupLabel reads the
            group context to associate itself, and throws when rendered as a
            sibling of the group instead of a child. */}
        <DropdownMenuRadioGroup
          value={String(playbackSpeed)}
          onValueChange={value => onPlaybackSpeedChange(Number(value))}
        >
          <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
            Speed
          </DropdownMenuLabel>
          {PLAYBACK_SPEED_OPTIONS.map(speed => (
            <DropdownMenuRadioItem
              key={speed}
              value={String(speed)}
              className={RADIO_ITEM_CLASS_NAME}
            >
              {speed}x
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={answerTextSize}
          onValueChange={value =>
            onAnswerTextSizeChange(value as AnswerTextSize)
          }
        >
          <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
            Answer text
          </DropdownMenuLabel>
          {ANSWER_TEXT_SIZE_OPTIONS.map(size => (
            <DropdownMenuRadioItem
              key={size}
              value={size}
              className={RADIO_ITEM_CLASS_NAME}
            >
              {ANSWER_TEXT_MENU_LABEL[size]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={videoSize}
          onValueChange={value => onVideoSizeChange(value as VideoSize)}
        >
          <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
            Video size
          </DropdownMenuLabel>
          {VIDEO_SIZE_OPTIONS.map(size => (
            <DropdownMenuRadioItem
              key={size}
              value={size}
              className={RADIO_ITEM_CLASS_NAME}
            >
              {VIDEO_SIZE_LABEL[size]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
