'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { IeltsQuestionType } from '@/modules/ielts/constants'
import { startIeltsDrillApi } from '@/requests/ieltsApi'
import { ExamButton } from '@/components/ielts/ui'

/** Starts a drill of one question type (groups from published tests). */
export function DrillButton({
  skill,
  type,
}: {
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
        caught instanceof Error ? caught.message : 'Không mở được drill.'
      )
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ExamButton
        disabled={busy}
        onClick={() => void start()}
        tone="paper"
        type="button"
      >
        {busy ? 'Đang mở...' : 'Luyện dạng này'}
      </ExamButton>
      {error ? (
        <span
          className="text-ex-wrong text-xs font-semibold"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </span>
  )
}
