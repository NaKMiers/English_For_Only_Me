'use client'

import { memo, type KeyboardEvent } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import { IELTS_ANSWER_MAX_LENGTH } from '@/modules/ielts/constants'
import type { IeltsOption } from '@/modules/ielts/schema'

import { QuestionNumberBadge } from './QuestionNumberBadge'
import { answerText, questionControlId, useIeltsAnswers } from './answerContext'
import { EvidenceIconButton } from './EvidenceIconButton'
import { ReviewMark } from './ReviewMark'

interface Props {
  number: number
  describedBy?: string
  /** Letters to pick from instead of typing ("Choose the correct letter"). */
  options?: IeltsOption[]
}

/** Enter moves to the next question, like the computer-delivered test. */
function focusNext(number: number) {
  const next = document.getElementById(questionControlId(number + 1))

  next?.focus()
}

/**
 * An inline blank inside a note, table, form or sentence: a number tag, an
 * input that grows with its content (9ch to 24ch), or a letter dropdown when
 * `options` is given, and, in Guided practice, its show-in-text key.
 */
export const SlotInput = memo(function SlotInput({
  describedBy,
  number,
  options,
}: Props) {
  const t = useMessages().ielts.widgets
  const { answers, onFocusQuestion, readOnly, review, setAnswer } =
    useIeltsAnswers()
  const value = answerText(answers[String(number)])
  const mark = review?.[number]
  const markClass = cn(
    mark?.outcome === 'correct' && 'border-lesson-correct bg-lesson-correct/10',
    mark && mark.outcome !== 'correct' && 'border-danger bg-danger-soft'
  )

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    focusNext(number)
  }

  return (
    <span className="mx-0.5 inline-flex max-w-full flex-wrap items-center gap-1 align-baseline">
      <QuestionNumberBadge
        number={number}
        size="sm"
      />
      {options ? (
        <Select
          disabled={readOnly}
          onValueChange={next => setAnswer(number, String(next ?? ''))}
          // Null shows the "-" placeholder; there is no blank item to pick,
          // so a chosen letter can only change, not clear.
          value={value || null}
        >
          <SelectTrigger
            aria-describedby={describedBy}
            aria-label={format(t.question, { number })}
            className={cn(
              'border-line rounded-tag bg-surface min-w-20 border font-semibold data-[size=sm]:min-h-7 data-[size=sm]:py-0',
              markClass
            )}
            id={questionControlId(number)}
            onFocus={() => onFocusQuestion(number)}
            size="sm"
          >
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem
                key={option.key}
                value={option.key}
              >
                {option.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          aria-describedby={describedBy}
          aria-label={format(t.question, { number })}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            'border-line text-ink focus-visible:border-line rounded-tag bg-surface h-7 border px-2 text-[16px] font-medium shadow-none focus-visible:ring-0 md:text-[16px] pointer-coarse:h-11',
            markClass
          )}
          id={questionControlId(number)}
          maxLength={IELTS_ANSWER_MAX_LENGTH}
          onChange={event => setAnswer(number, event.target.value)}
          onFocus={() => onFocusQuestion(number)}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            width: `${Math.min(24, Math.max(10, value.length + 3))}ch`,
          }}
          value={value}
        />
      )}
      <EvidenceIconButton number={number} />
      {mark ? <ReviewMark mark={mark} /> : null}
    </span>
  )
})
