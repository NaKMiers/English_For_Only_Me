'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { buildDictationCorrection } from '@/modules/dictation/correction'
import type { DictationCorrectionResult } from '@/modules/dictation/correction'
import { ExamButton } from '@/components/ielts/ui'

/**
 * "Gõ lại câu này": retype the script line that holds the answer, checked
 * with the Dictation Lab's word correction. Nothing is stored (v1).
 */
export function LineDictation({ line }: { line: string }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<DictationCorrectionResult | null>(null)

  if (!line) return null

  if (!open)
    return (
      <div>
        <ExamButton
          onClick={() => setOpen(true)}
          tone="paper"
          type="button"
        >
          Gõ lại câu này
        </ExamButton>
      </div>
    )

  const check = () =>
    setResult(
      buildDictationCorrection({
        action: 'check',
        expectedText: line,
        typedAnswer: typed,
      })
    )

  return (
    <div className="border-ex-line grid gap-2 rounded-lg border bg-white p-3">
      <p className="text-sm">
        Nhớ lại câu trong audio rồi gõ lại, không nhìn transcript.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Câu bạn nghe được"
          autoComplete="off"
          className="border-ex-line h-11 min-w-0 flex-1 border bg-white text-base"
          onChange={event => setTyped(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') check()
          }}
          spellCheck={false}
          value={typed}
        />
        <ExamButton
          onClick={check}
          tone="ink"
          type="button"
        >
          Kiểm tra
        </ExamButton>
      </div>
      {result ? (
        <p
          aria-live="polite"
          className="leading-[1.9]"
        >
          {result.feedbackTokens.map((token, index) => (
            <span
              className={cn(
                'mr-1 rounded-md px-0.5',
                token.status === 'correct' || token.status === 'spellingVariant'
                  ? 'text-ex-correct'
                  : 'bg-ex-soft text-ex-wrong font-bold',
                token.status === 'extra' && 'line-through'
              )}
              key={index}
              title={token.status}
            >
              {token.status === 'missing'
                ? `(${token.expectedOriginal ?? token.expected})`
                : (token.actualOriginal ??
                  token.actual ??
                  token.expectedOriginal)}
            </span>
          ))}
          <span className="block text-sm font-bold">
            {result.isPassed ? 'Đúng hết.' : `Đúng ${result.stats.accuracy}%.`}
          </span>
        </p>
      ) : null}
    </div>
  )
}
