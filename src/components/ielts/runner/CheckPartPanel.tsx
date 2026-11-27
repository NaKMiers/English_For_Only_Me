'use client'

import { CheckCheck } from 'lucide-react'

import { ExamButton } from '@/components/ielts/ui'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { formatNodes } from '@/i18n/formatNodes'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
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
export function CheckPartPanel({
  check,
  checking,
  className,
  label,
  onCheck,
}: Props) {
  const t = useMessages().ielts.check

  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-3', className)}
    >
      {/* Always mounted, so the score is announced when it arrives. */}
      <p
        aria-live="polite"
        className="text-sm empty:hidden"
      >
        {check
          ? formatNodes(t.correct, {
              score: (
                <strong className="font-sans font-semibold tabular-nums">
                  {check.raw}/{check.total}
                </strong>
              ),
            })
          : null}
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
        {checking
          ? t.checking
          : check
            ? t.checkAgain
            : format(t.check, { part: label })}
      </ExamButton>
    </div>
  )
}
