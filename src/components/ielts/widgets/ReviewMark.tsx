import { Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { IeltsReviewMark } from './answerContext'

const LABELS = { correct: 'Correct', wrong: 'Wrong', blank: 'Blank' } as const

/**
 * Minimal mark: a green tick when right, a red cross plus the answer when
 * wrong, and just the answer when blank (the empty box already says so).
 * Screen readers still hear the outcome word.
 */
export function ReviewMark({
  className,
  mark,
  showAccepted = true,
}: {
  className?: string
  mark: IeltsReviewMark
  showAccepted?: boolean
}) {
  const answer =
    showAccepted && mark.outcome !== 'correct' && mark.accepted.length
      ? mark.accepted.join(' / ')
      : ''

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1 text-sm font-semibold',
        className
      )}
    >
      <span className="sr-only">
        {LABELS[mark.outcome]}
        {answer ? '. Answer:' : ''}
      </span>
      {mark.outcome === 'correct' ? (
        <Check
          aria-hidden="true"
          className="text-lesson-correct size-4"
        />
      ) : null}
      {mark.outcome === 'wrong' ? (
        <X
          aria-hidden="true"
          className="text-manga-red size-4"
        />
      ) : null}
      {answer ? <span className="text-lesson-correct">{answer}</span> : null}
    </span>
  )
}
