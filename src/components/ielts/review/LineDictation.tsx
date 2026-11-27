'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import { buildDictationCorrection } from '@/modules/dictation/correction'
import type { DictationCorrectionResult } from '@/modules/dictation/correction'
import { ExamButton } from '@/components/ielts/ui'

/**
 * "Retype this line": retype the script line that holds the answer, checked
 * with the Dictation Lab's word correction. Nothing is stored (v1).
 */
export function LineDictation({ line }: { line: string }) {
  const t = useMessages().ielts.lineDictation
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
          {t.open}
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
    <div className="border-line rounded-control bg-surface grid gap-2 border p-3">
      <p className="text-sm">{t.hint}</p>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label={t.inputLabel}
          autoComplete="off"
          className="border-line bg-surface h-11 min-w-0 flex-1 border text-base"
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
          {t.check}
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
                'rounded-tag mr-1 px-0.5',
                token.status === 'correct' || token.status === 'spellingVariant'
                  ? 'text-lesson-correct'
                  : 'bg-tint-soft text-brand font-bold',
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
            {result.isPassed
              ? t.allCorrect
              : format(t.accuracy, { accuracy: result.stats.accuracy })}
          </span>
        </p>
      ) : null}
    </div>
  )
}
