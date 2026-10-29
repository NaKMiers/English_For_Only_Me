import { Check, Minus, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { IeltsReviewMark } from './answerContext'

const LABELS = { correct: 'Đúng', wrong: 'Sai', blank: 'Bỏ trống' } as const

/** Colour always paired with an icon and a word (a11y rule). */
export function ReviewMark({
  className,
  mark,
  showAccepted = true,
}: {
  className?: string
  mark: IeltsReviewMark
  showAccepted?: boolean
}) {
  const Icon =
    mark.outcome === 'correct' ? Check : mark.outcome === 'wrong' ? X : Minus

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold',
        mark.outcome === 'correct'
          ? 'bg-ex-correct-soft text-ex-correct'
          : mark.outcome === 'wrong'
            ? 'bg-ex-wrong-soft text-ex-wrong'
            : 'bg-ex-soft text-ex-muted',
        className
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-4"
      />
      {LABELS[mark.outcome]}
      {showAccepted && mark.outcome !== 'correct' && mark.accepted.length ? (
        <span className="text-ex-ink font-normal">
          · Đáp án: {mark.accepted.join(' / ')}
        </span>
      ) : null}
    </span>
  )
}
