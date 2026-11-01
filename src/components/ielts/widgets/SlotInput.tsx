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
import { cn } from '@/lib/utils'
import { IELTS_ANSWER_MAX_LENGTH } from '@/modules/ielts/constants'
import type { IeltsOption } from '@/modules/ielts/schema'

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
  const {
    answers,
    currentNumber,
    onFocusQuestion,
    readOnly,
    review,
    setAnswer,
  } = useIeltsAnswers()
  const value = answerText(answers[String(number)])
  const mark = review?.[number]
  const markClass = cn(
    mark?.outcome === 'correct' && 'border-lesson-correct bg-lesson-correct/10',
    mark && mark.outcome !== 'correct' && 'border-manga-red bg-manga-pale-red'
  )

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    focusNext(number)
  }

  return (
    <span className="mx-0.5 inline-flex max-w-full flex-wrap items-center gap-1 align-baseline">
      <span
        aria-hidden="true"
        className={cn(
          'rounded-tag inline-grid h-5 min-w-5 place-items-center px-1 text-[11px] font-bold tabular-nums',
          currentNumber === number
            ? 'bg-manga-red text-manga-white'
            : 'bg-manga-pale-red text-muted-foreground'
        )}
      >
        {number}
      </span>
      {options ? (
        <Select
          disabled={readOnly}
          onValueChange={next => setAnswer(number, String(next ?? ''))}
          value={value}
        >
          <SelectTrigger
            aria-describedby={describedBy}
            aria-label={`Question ${number}`}
            className={cn(
              'border-manga-black rounded-tag bg-manga-white min-w-20 border-2 font-semibold',
              markClass
            )}
            id={questionControlId(number)}
            onFocus={() => onFocusQuestion(number)}
            size="sm"
          >
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">-</SelectItem>
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
          aria-label={`Question ${number}`}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            'border-manga-black text-manga-black focus-visible:border-manga-red rounded-tag bg-manga-white h-8 border-2 px-2 text-[16px] font-medium shadow-none focus-visible:ring-0 md:text-[16px] pointer-coarse:h-11',
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
