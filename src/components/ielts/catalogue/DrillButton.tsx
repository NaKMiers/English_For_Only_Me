'use client'

import { CircleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useMessages } from '@/i18n/client'
import type { IeltsQuestionType } from '@/modules/ielts/constants'
import { ieltsErrorMessage, startIeltsDrillApi } from '@/requests/ieltsApi'
import { ExamButton } from '@/components/ielts/ui'

/** Starts a drill of one question type (groups from published tests). */
export function DrillButton({
  compact = false,
  skill,
  type,
}: {
  /** A small "Drill" button for a one-line row. */
  compact?: boolean
  skill: 'listening' | 'reading'
  type: IeltsQuestionType
}) {
  const t = useMessages().ielts.drill
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const start = async () => {
    setBusy(true)
    setError('')

    try {
      const { attempt } = await startIeltsDrillApi({
        idempotencyKey: crypto.randomUUID(),
        skill,
        type,
      })

      router.push(`/ielts/drill/${attempt.id}`)
    } catch (caught) {
      setBusy(false)
      setError(ieltsErrorMessage(caught, t.failed))
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ExamButton
        className={compact ? 'min-h-8 px-2.5 text-xs' : undefined}
        disabled={busy}
        onClick={() => void start()}
        title={compact ? t.title : undefined}
        tone="paper"
        type="button"
      >
        {busy ? t.opening : compact ? t.compact : t.full}
      </ExamButton>
      {error ? (
        <span
          className="text-danger inline-flex items-center gap-1 text-xs font-medium"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
            className="size-3.5 shrink-0"
          />
          {error}
        </span>
      ) : null}
    </span>
  )
}
