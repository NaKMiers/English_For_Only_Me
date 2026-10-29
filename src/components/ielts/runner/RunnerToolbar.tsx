'use client'

import { ArrowLeft, Clock, Send } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { ExamButton, ExamIconButton } from '../ui'
import type { IeltsSaveState } from './useAttemptAnswers'
import { formatClock, IELTS_TIMER_WARNING_SECONDS } from './useMockDeadline'

const SAVE_LABELS: Record<IeltsSaveState, string> = {
  idle: 'Chưa lưu',
  pending: 'Đang lưu...',
  saving: 'Đang lưu...',
  saved: 'Đã lưu',
  offline: 'Ngoại tuyến, bài vẫn lưu trên máy',
  timeup: 'Hết giờ',
}

interface Props {
  backHref?: string
  modeLabel: string
  onBack?: () => void
  onSubmit: () => void
  saveState: IeltsSaveState
  secondsLeft: number | null
  submitDisabled: boolean
  submitting: boolean
  title: string
  toggles?: ReactNode
}

/** Shown at 10, 5 and 1 minute left only, so a screen reader is not spammed. */
function timerAnnouncement(seconds: number) {
  if (seconds === 600) return 'Còn 10 phút'
  if (seconds === 300) return 'Còn 5 phút'
  if (seconds === 60) return 'Còn 1 phút'

  return ''
}

/**
 * The exam header: exit and title on the left, the clock in the middle (as
 * on the computer-delivered test), helpers and Submit on the right.
 */
export function RunnerToolbar({
  backHref,
  modeLabel,
  onBack,
  onSubmit,
  saveState,
  secondsLeft,
  submitDisabled,
  submitting,
  title,
  toggles,
}: Props) {
  const urgent =
    secondsLeft !== null && secondsLeft <= IELTS_TIMER_WARNING_SECONDS
  const back = (
    <ArrowLeft
      aria-hidden="true"
      className="size-5"
    />
  )

  return (
    <header className="border-ex-line grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b bg-white px-3 py-2 sm:px-4 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <ExamIconButton
            label="Thoát"
            onClick={onBack}
            type="button"
          >
            {back}
          </ExamIconButton>
        ) : (
          <ExamIconButton
            href={backHref ?? '/ielts'}
            label="Thoát"
          >
            {back}
          </ExamIconButton>
        )}
        <div className="grid min-w-0">
          <p className="text-ex-ink truncate text-[15px] font-bold">{title}</p>
          <p className="text-ex-muted flex items-center gap-2 text-xs">
            <span className="bg-ex-soft rounded px-1.5 py-0.5 font-semibold">
              {modeLabel}
            </span>
            <span
              aria-live="polite"
              className="inline-flex items-center gap-1"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block size-1.5 rounded-full',
                  saveState === 'saved'
                    ? 'bg-ex-correct'
                    : saveState === 'offline' || saveState === 'timeup'
                      ? 'bg-ex-wrong'
                      : 'bg-ex-muted'
                )}
              />
              {SAVE_LABELS[saveState]}
            </span>
          </p>
        </div>
      </div>

      <div className="order-last col-span-2 flex justify-center md:order-none md:col-span-1">
        {secondsLeft !== null ? (
          <div
            aria-label="Thời gian còn lại"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1 font-sans text-xl font-bold tabular-nums',
              urgent ? 'bg-ex-wrong-soft text-ex-wrong' : 'text-ex-ink'
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
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-3">
        {toggles}
        <ExamButton
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
          {submitting ? 'Đang nộp...' : 'Nộp bài'}
        </ExamButton>
      </div>
    </header>
  )
}
