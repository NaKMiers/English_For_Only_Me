'use client'

import { ArrowLeft, Clock, Moon, Send, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { useTheme } from '@/components/common/ThemeProvider'
import { cn } from '@/lib/utils'

import { ExamButton, ExamIconButton } from '../ui'
import type { IeltsSaveState } from './useAttemptAnswers'
import { formatClock, IELTS_TIMER_WARNING_SECONDS } from './useMockDeadline'

const SAVE_LABELS: Record<IeltsSaveState, string> = {
  idle: 'Not saved',
  pending: 'Saving...',
  saving: 'Saving...',
  saved: 'Saved',
  offline: 'Offline, answers saved on this device',
  timeup: 'Time is up',
}

interface Props {
  backHref?: string
  modeLabel: string
  onBack?: () => void
  onSubmit: () => void
  /** Phone/tablet pane switcher, shown in the second row below `lg`. */
  panes?: ReactNode
  saveState: IeltsSaveState
  secondsLeft: number | null
  submitDisabled: boolean
  submitting: boolean
  title: string
  toggles?: ReactNode
}

/** Shown at 10, 5 and 1 minute left only, so a screen reader is not spammed. */
function timerAnnouncement(seconds: number) {
  if (seconds === 600) return '10 minutes remaining'
  if (seconds === 300) return '5 minutes remaining'
  if (seconds === 60) return '1 minute remaining'

  return ''
}

/**
 * The exam header: exit and title on the left, then helpers and the clock,
 * then a quiet dark-mode switch and Submit. Below `lg` the pane switcher,
 * helpers (Guided, Transcript) and clock share one compact second row, so the
 * whole header stays two short rows on a phone.
 */
export function RunnerToolbar({
  backHref,
  modeLabel,
  onBack,
  onSubmit,
  panes,
  saveState,
  secondsLeft,
  submitDisabled,
  submitting,
  title,
  toggles,
}: Props) {
  const { theme, toggle } = useTheme()
  const lightUp = theme === 'lightup'
  const urgent =
    secondsLeft !== null && secondsLeft <= IELTS_TIMER_WARNING_SECONDS
  const back = (
    <ArrowLeft
      aria-hidden="true"
      className="size-5"
    />
  )

  const clock =
    secondsLeft !== null ? (
      <div
        aria-label="Time remaining"
        className={cn(
          'border-manga-black rounded-control inline-flex h-9 shrink-0 items-center gap-1.5 border-2 px-2.5 font-sans text-base font-black tabular-nums sm:text-lg',
          urgent
            ? 'bg-manga-pale-red text-manga-red animate-pulse'
            : 'bg-manga-white text-manga-black'
        )}
        role="timer"
      >
        <Clock
          aria-hidden="true"
          className="size-4"
        />
        {formatClock(secondsLeft)}
        <span
          aria-live="polite"
          className="sr-only"
        >
          {timerAnnouncement(secondsLeft)}
        </span>
      </div>
    ) : null

  return (
    <header className="border-manga-black bg-manga-white flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b-3 px-3 py-2 sm:px-4">
      {onBack ? (
        <ExamIconButton
          className="size-10"
          label="Leave"
          onClick={onBack}
          type="button"
        >
          {back}
        </ExamIconButton>
      ) : (
        <ExamIconButton
          className="size-10"
          href={backHref ?? '/ielts'}
          label="Leave"
        >
          {back}
        </ExamIconButton>
      )}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-manga-black truncate font-sans text-[15px] leading-tight font-black">
          {title}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className="text-manga-red shrink-0 font-sans text-[11px] leading-none font-black tracking-wide uppercase">
            {modeLabel}
          </span>
          <span
            aria-hidden="true"
            className="text-manga-ink-soft/60"
          >
            ·
          </span>
          <span
            aria-live="polite"
            className="text-manga-ink-soft inline-flex min-w-0 items-center gap-1 font-semibold"
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-block size-1.5 shrink-0 rounded-full',
                saveState === 'saved'
                  ? 'bg-lesson-correct'
                  : saveState === 'offline' || saveState === 'timeup'
                    ? 'bg-manga-red'
                    : 'bg-manga-ink-soft/50'
              )}
            />
            <span className="truncate">{SAVE_LABELS[saveState]}</span>
          </span>
        </p>
      </div>

      {panes || toggles || clock ? (
        // Own row below lg (switcher left, helpers and clock right); inline
        // from lg, where both panes are on screen and the switcher hides.
        <div className="order-last flex basis-full items-center gap-2 lg:order-none lg:basis-auto">
          {panes ? (
            <div className="min-w-0 flex-1 lg:hidden">{panes}</div>
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {toggles}
            {clock}
          </div>
        </div>
      ) : null}

      {/* The exam stage covers the global hanging lamp, so it gets its own
          quiet switch beside Submit. Toggle (aria-pressed): raw-button exception. */}
      <button
        aria-label={lightUp ? 'Turn off dark mode' : 'Turn on dark mode'}
        aria-pressed={lightUp}
        className="text-manga-ink-soft hover:bg-manga-paper-soft hover:text-manga-black rounded-tag -mx-1.5 inline-grid size-9 shrink-0 place-items-center transition-colors"
        onClick={toggle}
        title={lightUp ? 'Dark mode on' : 'Dark mode'}
        type="button"
      >
        {lightUp ? (
          <Sun
            aria-hidden="true"
            className="size-4"
          />
        ) : (
          <Moon
            aria-hidden="true"
            className="size-4"
          />
        )}
      </button>

      <ExamButton
        // Red, not ink: a black face melts into its own black shadow.
        className="bg-manga-red text-manga-white min-h-10 px-3 sm:px-4"
        disabled={submitDisabled || submitting}
        icon={
          <Send
            aria-hidden="true"
            className="size-4"
          />
        }
        onClick={onSubmit}
        tone="ink"
        type="button"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </ExamButton>
    </header>
  )
}

/**
 * A helper switch for the toolbar (Guided, Transcript): a small sticker chip
 * that turns black while on. Icon-only on phones so it fits beside the pane
 * switcher; the label stays as its accessible name and tooltip.
 */
export function ToolbarToggle({
  checked,
  icon,
  label,
  onCheckedChange,
}: {
  checked: boolean
  icon: ReactNode
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    // Toggle chip (aria-pressed): documented raw-button exception.
    <button
      aria-pressed={checked}
      className={cn(
        'border-manga-black rounded-tag sticker-press inline-flex h-9 items-center justify-center gap-1.5 border-2 px-2.5 font-sans text-xs font-black transition-colors max-sm:w-9 max-sm:px-0 [&_svg]:size-4',
        checked
          ? 'bg-manga-black text-manga-white'
          : 'bg-manga-white text-manga-black hover:bg-manga-paper-soft shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
      )}
      onClick={() => onCheckedChange(!checked)}
      title={label}
      type="button"
    >
      {icon}
      <span className="max-sm:sr-only">{label}</span>
    </button>
  )
}
