'use client'

import {
  ChevronDown,
  RefreshCw,
  SkipBack,
  SlidersHorizontal,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMessages } from '@/i18n/client'
import {
  ANSWER_TEXT_SIZE_OPTIONS,
  PLAYBACK_SPEED_OPTIONS,
  VIDEO_SIZE_OPTIONS,
  type AnswerTextSize,
  type VideoSize,
} from '@/modules/dictation/preferences/dictationPreferences'

/** The answer and shortcut preferences, toggled as checkbox items. */
export interface PracticeToggles {
  showAnswerImmediately: boolean
  showFullAnswer: boolean
  showShortcuts: boolean
}

interface Props {
  answerTextSize: AnswerTextSize
  onAnswerTextSizeChange: (size: AnswerTextSize) => void
  onPlaybackSpeedChange: (speed: number) => void
  /** Opens the restart confirmation (the caller owns the dialog). */
  onRestart?: () => void
  /** Jumps back to the first sentence. */
  onRewind?: () => void
  onToggleChange?: (key: keyof PracticeToggles, value: boolean) => void
  onVideoSizeChange: (size: VideoSize) => void
  playbackSpeed: number
  toggles?: PracticeToggles
  videoSize: VideoSize
}

const GROUP_LABEL_CLASS_NAME =
  'text-ink-soft px-3 pt-1 font-sans text-[0.65rem] font-normal'

const RADIO_ITEM_CLASS_NAME =
  'focus:bg-tint data-checked:bg-tint min-h-11 rounded-tag py-1 pr-8 pl-3 font-sans text-xs font-medium'

/**
 * Playback speed, answer text size, video size, the answer preferences and
 * the rare session actions (rewind, restart) behind one popover.
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
  onRestart,
  onRewind,
  onToggleChange,
  onVideoSizeChange,
  playbackSpeed,
  toggles,
  videoSize,
}: Props) {
  const t = useMessages()
  const text = t.dictation.settings
  // Spelled out rather than the toolbar's S/M/L/XL: a menu row has the width
  // for a real word, and a bare "XL" on its own line reads like a shirt size.
  const answerTextLabels: Record<AnswerTextSize, string> = text.answerTextSizes
  const videoSizeLabels: Record<VideoSize, string> = t.dictation.videoSizes

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text.label}
        title={text.label}
        className="soft-press hover-pop border-line bg-surface text-ink hover:bg-tint inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3 font-sans text-xs font-medium"
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
            {text.speed}
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
            {text.answerText}
          </DropdownMenuLabel>
          {ANSWER_TEXT_SIZE_OPTIONS.map(size => (
            <DropdownMenuRadioItem
              key={size}
              value={size}
              className={RADIO_ITEM_CLASS_NAME}
            >
              {answerTextLabels[size]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={videoSize}
          onValueChange={value => onVideoSizeChange(value as VideoSize)}
        >
          <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
            {text.videoSize}
          </DropdownMenuLabel>
          {VIDEO_SIZE_OPTIONS.map(size => (
            <DropdownMenuRadioItem
              key={size}
              value={size}
              className={RADIO_ITEM_CLASS_NAME}
            >
              {videoSizeLabels[size]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {toggles && onToggleChange ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
                {text.answers}
              </DropdownMenuLabel>
              {(
                [
                  [
                    'showAnswerImmediately',
                    t.dictation.practice.showAnswerImmediately,
                  ],
                  ['showFullAnswer', t.dictation.practice.showFullAnswer],
                  ['showShortcuts', t.dictation.practice.shortcutHints],
                ] as const
              ).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  checked={toggles[key]}
                  className={RADIO_ITEM_CLASS_NAME}
                  closeOnClick={false}
                  key={key}
                  onCheckedChange={checked => onToggleChange(key, checked)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}

        {onRewind || onRestart ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
                {text.session}
              </DropdownMenuLabel>
              {onRewind ? (
                <DropdownMenuItem
                  className={RADIO_ITEM_CLASS_NAME}
                  onClick={onRewind}
                >
                  <SkipBack aria-hidden="true" />
                  {t.dictation.controls.rewind}
                </DropdownMenuItem>
              ) : null}
              {onRestart ? (
                <DropdownMenuItem
                  className={RADIO_ITEM_CLASS_NAME}
                  onClick={onRestart}
                >
                  <RefreshCw aria-hidden="true" />
                  {t.dictation.controls.restart}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
