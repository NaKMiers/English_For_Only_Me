'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { buildDictationCorrection } from '@/modules/dictation/correction'
import type { DictationCorrectionResult } from '@/modules/dictation/correction'
import { ExamButton } from '@/components/ielts/ui'

/**
 * "Retype this line": retype the script line that holds the answer, checked
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
          Retype this line
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
    <div className="border-manga-black rounded-control bg-manga-white grid gap-2 border-2 p-3">
      <p className="text-sm">
        Recall the line from the audio and type it without looking at the
        transcript.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="The line you heard"
          autoComplete="off"
          className="border-manga-black bg-manga-white h-11 min-w-0 flex-1 border-2 text-base"
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
          Check
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
                  : 'bg-manga-pale-red text-manga-red font-bold',
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
              ? 'All correct.'
              : `${result.stats.accuracy}% correct.`}
          </span>
        </p>
      ) : null}
    </div>
  )
}
