'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { IeltsQuestionType } from '@/modules/ielts/constants'
import { startIeltsDrillApi } from '@/requests/ieltsApi'
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
      setError(
        caught instanceof Error ? caught.message : 'Could not open the drill.'
      )
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ExamButton
        className={compact ? 'min-h-8 px-2.5 text-xs' : undefined}
        disabled={busy}
        onClick={() => void start()}
        title={compact ? 'Drill this question type' : undefined}
        tone="paper"
        type="button"
      >
        {busy ? 'Opening...' : compact ? 'Drill' : 'Drill this type'}
      </ExamButton>
      {error ? (
        <span
          className="text-brand text-xs font-semibold"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </span>
  )
}
