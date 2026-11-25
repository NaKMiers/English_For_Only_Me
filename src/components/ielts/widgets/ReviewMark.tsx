import { ArrowRight, Check, CircleDashed, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { IeltsReviewMark } from './answerContext'

const LABELS = { correct: 'Correct', wrong: 'Wrong', blank: 'Blank' } as const

/**
 * Colour always paired with an icon and a word (a11y rule). Blank shows its
 * icon only (the word stays for screen readers and the tooltip), then the
 * accepted answer in green after an arrow.
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
  const Icon =
    mark.outcome === 'correct'
      ? Check
      : mark.outcome === 'wrong'
        ? X
        : CircleDashed

  return (
    <span
      className={cn(
        'rounded-tag inline-flex flex-wrap items-center gap-1 px-1.5 py-0.5 text-sm font-semibold',
        mark.outcome === 'correct'
          ? 'bg-lesson-correct/10 text-lesson-correct'
          : // A blank costs the point like a wrong answer: same red.
            'bg-manga-pale-red text-manga-red',
        className
      )}
      title={mark.outcome === 'blank' ? LABELS.blank : undefined}
    >
      <Icon
        aria-hidden="true"
        className="size-4"
      />
      {mark.outcome === 'blank' ? (
        <span className="sr-only">{LABELS.blank}</span>
      ) : (
        LABELS[mark.outcome]
      )}
      {showAccepted && mark.outcome !== 'correct' && mark.accepted.length ? (
        <>
          <ArrowRight
            aria-hidden="true"
            className="text-manga-black size-3.5"
          />
          <span className="text-lesson-correct font-bold">
            <span className="sr-only">Answer: </span>
            {mark.accepted.join(' / ')}
          </span>
        </>
      ) : null}
    </span>
  )
}
