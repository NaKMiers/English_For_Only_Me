'use client'

import { ArrowRight, Check, CircleDashed, X } from 'lucide-react'

import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'

import type { IeltsReviewMark } from './answerContext'

/**
 * Colour always paired with an icon and a word (a11y rule). Blank shows its
 * icon only (the word stays for screen readers and the tooltip), then the
 * accepted answer in green after an arrow.
 */
export function ReviewMark({
  className,
  mark,
  showAccepted = true,
  wordSrOnly = false,
}: {
  className?: string
  mark: IeltsReviewMark
  showAccepted?: boolean
  /**
   * Icon only, the word for screen readers (the result table, where a row
   * of "Correct" / "Wrong" words would repeat what the icons say). The
   * in-runner paper review keeps the word.
   */
  wordSrOnly?: boolean
}) {
  const t = useMessages().ielts.widgets
  const labels = t.marks
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
            'bg-danger-soft text-danger',
        className
      )}
      title={mark.outcome === 'blank' ? labels.blank : undefined}
    >
      <Icon
        aria-hidden="true"
        className="size-4"
      />
      {mark.outcome === 'blank' || wordSrOnly ? (
        <span className="sr-only">{labels[mark.outcome]}</span>
      ) : (
        labels[mark.outcome]
      )}
      {showAccepted && mark.outcome !== 'correct' && mark.accepted.length ? (
        <>
          <ArrowRight
            aria-hidden="true"
            className="text-ink size-3.5"
          />
          <span className="text-lesson-correct font-bold">
            <span className="sr-only">{t.answerPrefix} </span>
            {mark.accepted.join(' / ')}
          </span>
        </>
      ) : null}
    </span>
  )
}
