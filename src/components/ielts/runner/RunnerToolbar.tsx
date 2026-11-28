'use client'

import { ArrowLeft, Clock, Moon, Send, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { useTheme } from '@/components/common/ThemeProvider'
import { useMessages } from '@/i18n/client'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

import { ExamButton, ExamIconButton } from '../ui'
import type { IeltsSaveState } from './useAttemptAnswers'
import { formatClock, IELTS_TIMER_WARNING_SECONDS } from './useMockDeadline'

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
function timerAnnouncement(t: Messages['ielts']['toolbar'], seconds: number) {
  if (seconds === 600) return t.tenMinutes
  if (seconds === 300) return t.fiveMinutes
  if (seconds === 60) return t.oneMinute

  return ''
}

/**
 * The exam header: exit and title on the left, then helpers and the clock,
 * then a quiet dark-mode switch and Submit. Below `lg` the reading pane
 * switcher, helpers (Guided) and clock share one compact second row; with no
 * switcher (listening) the header is a single row on a phone.
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
  const t = useMessages().ielts.toolbar
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
        aria-label={t.timeRemaining}
        className={cn(
          'border-line rounded-control inline-flex h-9 shrink-0 items-center gap-1.5 border px-2.5 font-sans text-base font-semibold tabular-nums sm:text-lg',
          urgent
            ? 'bg-tint-soft text-brand animate-pulse'
            : 'bg-surface text-ink'
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
          {timerAnnouncement(t, secondsLeft)}
        </span>
      </div>
    ) : null

  return (
    <header className="border-line bg-exam-surface flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2 sm:px-4">
      {onBack ? (
        <ExamIconButton
          className="size-10"
          label={t.leave}
          onClick={onBack}
          type="button"
        >
          {back}
        </ExamIconButton>
      ) : (
        <ExamIconButton
          className="size-10"
          href={backHref ?? '/ielts'}
          label={t.leave}
        >
          {back}
        </ExamIconButton>
      )}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-ink truncate font-sans text-[15px] leading-tight font-semibold">
          {title}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className="text-brand shrink-0 font-sans text-[11px] leading-none font-semibold tracking-wide">
            {modeLabel}
          </span>
          <span
            aria-hidden="true"
            className="text-ink-soft/60"
          >
            ·
          </span>
          <span
            aria-live="polite"
            className="text-ink-soft inline-flex min-w-0 items-center gap-1 font-normal"
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-block size-1.5 shrink-0 rounded-full',
                saveState === 'saved'
                  ? 'bg-lesson-correct'
                  : saveState === 'offline' || saveState === 'timeup'
                    ? 'bg-brand'
                    : 'bg-ink-soft/50'
              )}
            />
            <span className="truncate">{t.saveStates[saveState]}</span>
          </span>
        </p>
      </div>

      {panes || toggles || clock ? (
        // Own row below lg (switcher left, helpers and clock right); inline
        // from lg, where both panes are on screen and the switcher hides.
        // Without a switcher (listening) the helpers stay on the first row.
        <div
          className={cn(
            'flex items-center gap-2',
            panes && 'order-last basis-full lg:order-none lg:basis-auto'
          )}
        >
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
        aria-label={lightUp ? t.darkOff : t.darkOn}
        aria-pressed={lightUp}
        className="soft-press hover-pop text-ink-soft hover:bg-tint hover:text-ink -mx-1.5 inline-grid size-11 shrink-0 place-items-center rounded-full"
        onClick={toggle}
        title={lightUp ? t.darkOnTitle : t.darkTitle}
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
        // The one cta of the exam screen (no brand override).
        className="min-h-11 px-3 sm:px-4"
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
        {submitting ? t.submitting : t.submit}
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
        'border-line rounded-tag soft-press inline-flex min-h-11 items-center justify-center gap-1.5 border px-2.5 font-sans text-xs font-medium transition-colors max-sm:w-11 max-sm:px-0 sm:min-h-9 [&_svg]:size-4',
        checked
          ? 'bg-cta text-cta-fg'
          : 'bg-surface text-ink hover:bg-tint hover-pop'
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
