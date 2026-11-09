'use client'

import { CheckCheck } from 'lucide-react'

import { ExamButton } from '@/components/ielts/ui'

interface Props {
  /** The last check of this part, or null before the first one. */
  check: { raw: number; total: number } | null
  checking: boolean
  /** "Part 1", "Passage 2". */
  label: string
  onCheck: () => void
}

/**
 * Practice: the end of a part's questions. A check button, then the part's
 * score beside it; the marks show under each question.
 */
export function CheckPartPanel({ check, checking, label, onCheck }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {/* Always mounted, so the score is announced when it arrives. */}
      <p
        aria-live="polite"
        className="text-sm empty:hidden"
      >
        {check ? (
          <>
            <strong className="font-sans font-black tabular-nums">
              {check.raw}/{check.total}
            </strong>{' '}
            correct
          </>
        ) : null}
      </p>
      <ExamButton
        disabled={checking}
        icon={
          <CheckCheck
            aria-hidden="true"
            className="size-4"
          />
        }
        onClick={onCheck}
        tone="paper"
        type="button"
      >
        {checking ? 'Checking...' : check ? 'Check again' : `Check ${label}`}
      </ExamButton>
    </div>
  )
}
