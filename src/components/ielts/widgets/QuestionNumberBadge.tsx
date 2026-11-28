'use client'

import { Flag } from 'lucide-react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'

import { useIeltsAnswers } from './answerContext'

const SIZE_CLASS = {
  md: 'h-7 min-w-7 gap-0.5 px-1 text-sm',
  sm: 'h-5 min-w-5 gap-0.5 px-1 text-[11px]',
} as const

/**
 * The question number in front of a question or blank. While answering it
 * is a button that flags the question for a second look (amber with a flag);
 * the question the learner is on shows in ink, never red, since red means
 * wrong in review.
 */
export function QuestionNumberBadge({
  number,
  size = 'md',
}: {
  number: number
  size?: keyof typeof SIZE_CLASS
}) {
  const t = useMessages().ielts.widgets
  const { currentNumber, flagged, onToggleFlag } = useIeltsAnswers()
  const isFlagged = flagged?.has(number) ?? false
  const className = cn(
    'rounded-tag inline-flex shrink-0 items-center justify-center font-bold tabular-nums',
    SIZE_CLASS[size],
    isFlagged
      ? 'bg-highlight text-ink'
      : currentNumber === number
        ? 'bg-cta text-cta-fg'
        : 'bg-tint-soft text-ink'
  )
  const icon = isFlagged ? (
    <Flag
      aria-hidden="true"
      className={size === 'sm' ? 'size-2.5' : 'size-3'}
      fill="currentColor"
    />
  ) : null

  if (!onToggleFlag)
    return (
      <span
        aria-hidden="true"
        className={className}
      >
        {icon}
        {number}
      </span>
    )

  return (
    <button
      aria-label={format(isFlagged ? t.unflag : t.flag, { number })}
      aria-pressed={isFlagged}
      className={cn(
        className,
        'focus-visible:ring-line cursor-pointer outline-none hover:brightness-95 focus-visible:ring-2'
      )}
      onClick={() => onToggleFlag(number)}
      title={isFlagged ? t.flaggedTitle : t.flagTitle}
      type="button"
    >
      {icon}
      {number}
    </button>
  )
}
