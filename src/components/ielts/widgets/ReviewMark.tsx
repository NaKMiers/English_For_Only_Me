import { Check, Minus, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { IeltsReviewMark } from './answerContext'

const LABELS = { correct: 'Correct', wrong: 'Wrong', blank: 'Blank' } as const

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
        'rounded-tag inline-flex flex-wrap items-center gap-1 px-1.5 py-0.5 text-sm font-semibold',
        mark.outcome === 'correct'
          ? 'bg-lesson-correct/10 text-lesson-correct'
          : mark.outcome === 'wrong'
            ? 'bg-manga-pale-red text-manga-red'
            : 'bg-manga-pale-red text-muted-foreground',
        className
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-4"
      />
      {LABELS[mark.outcome]}
      {showAccepted && mark.outcome !== 'correct' && mark.accepted.length ? (
        <span className="text-manga-black font-normal">
          · Answer: {mark.accepted.join(' / ')}
        </span>
      ) : null}
    </span>
  )
}
