'use client'

import { memo, useCallback } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  IELTS_QUESTION_WIDGETS,
  TFNG_OPTIONS,
  YNNG_OPTIONS,
} from '@/modules/ielts/constants'
import type { IeltsPublicGroup } from '@/modules/ielts/publicView'
import type { IeltsOption } from '@/modules/ielts/schema'

import {
  answerText,
  questionBlockId,
  questionControlId,
  useIeltsAnswers,
} from './answerContext'
import { EvidenceIconButton } from './EvidenceIconButton'
import { IeltsMarkdown } from './IeltsMarkdown'
import { ReviewMark } from './ReviewMark'
import { SlotInput } from './SlotInput'

interface Props {
  group: IeltsPublicGroup
}

function optionsFor(group: IeltsPublicGroup): IeltsOption[] {
  if (group.type === 'true-false-not-given')
    return TFNG_OPTIONS.map(key => ({ key, text: '' }))

  if (group.type === 'yes-no-not-given')
    return YNNG_OPTIONS.map(key => ({ key, text: '' }))

  return group.options
}

function QuestionNumber({ number }: { number: number }) {
  const { currentNumber } = useIeltsAnswers()

  return (
    <span
      aria-hidden="true"
      className={cn(
        'rounded-tag inline-grid h-7 min-w-7 shrink-0 place-items-center px-1 text-sm font-bold tabular-nums',
        currentNumber === number
          ? 'bg-manga-red text-manga-white'
          : 'bg-manga-pale-red text-manga-black'
      )}
    >
      {number}
    </span>
  )
}

/** One question, one letter: MC with a single answer, TFNG, YNNG. */
function RadioQuestions({ group }: Props) {
  const { answers, onFocusQuestion, readOnly, review, setAnswer } =
    useIeltsAnswers()
  const options = optionsFor(group)
  const isJudgement = group.type !== 'multiple-choice'

  return (
    <ol className="grid gap-6">
      {group.questions.map(question => {
        const value = answerText(answers[String(question.number)])
        const promptId = `${questionControlId(question.number)}-prompt`
        const mark = review?.[question.number]

        return (
          <li
            className="grid gap-3"
            id={questionBlockId(question.number)}
            key={question.number}
          >
            <div className="flex items-start gap-3">
              <QuestionNumber number={question.number} />
              <p className="pt-0.5 font-medium">
                <span id={promptId}>{question.prompt}</span>{' '}
                <EvidenceIconButton number={question.number} />
              </p>
            </div>
            <RadioGroup
              aria-labelledby={promptId}
              className={cn('pl-10', isJudgement && 'flex flex-wrap')}
              onValueChange={next => setAnswer(question.number, String(next))}
              readOnly={readOnly}
              value={value || null}
            >
              {options.map((option, index) => {
                const id =
                  index === 0
                    ? questionControlId(question.number)
                    : `${questionControlId(question.number)}-${option.key}`

                return (
                  <Label
                    className={cn(
                      'rounded-control flex min-h-10 cursor-pointer items-start gap-3 border-2 px-3 py-2 text-[16px] font-normal transition-colors',
                      isJudgement && 'whitespace-nowrap',
                      value === option.key
                        ? 'border-manga-red bg-manga-paper-soft'
                        : 'hover:bg-manga-pale-red border-transparent'
                    )}
                    htmlFor={id}
                    key={option.key}
                  >
                    <RadioGroupItem
                      className="mt-1"
                      id={id}
                      onFocus={() => onFocusQuestion(question.number)}
                      value={option.key}
                    />
                    <span className="leading-[1.6]">
                      <strong className="font-sans font-black">
                        {option.key}
                      </strong>
                      {option.text ? ` ${option.text}` : ''}
                    </span>
                  </Label>
                )
              })}
            </RadioGroup>
            {mark ? (
              <div className="pl-10">
                <ReviewMark mark={mark} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

/** Choose TWO (or THREE): one set of letters stored under the first number. */
function CheckboxQuestions({ group }: Props) {
  const { answers, onFocusQuestion, readOnly, review, setAnswer } =
    useIeltsAnswers()
  const first = group.from
  const size = group.to - group.from + 1
  const raw = answers[String(first)]
  const chosen = Array.isArray(raw) ? raw : raw ? raw.split(',') : []
  const full = chosen.length >= size
  const stem = group.questions[0]?.prompt ?? ''

  const toggle = (key: string, checked: boolean) => {
    const next = checked
      ? [...chosen.filter(item => item !== key), key].slice(0, size)
      : chosen.filter(item => item !== key)

    setAnswer(first, next)
  }

  return (
    <div
      className="grid gap-3"
      id={questionBlockId(first)}
    >
      <div className="flex items-start gap-3">
        <span className="bg-manga-pale-red rounded-tag inline-grid h-7 shrink-0 place-items-center px-1.5 text-sm font-bold tabular-nums">
          {group.from}-{group.to}
        </span>
        <p className="pt-0.5 font-medium">
          {stem}
          {stem ? ' ' : null}
          <EvidenceIconButton number={first} />
        </p>
      </div>
      <p
        className="text-muted-foreground pl-10 text-sm"
        role="status"
      >
        Chosen {chosen.length}/{size}
        {full && !readOnly ? '. Remove a choice to change it.' : ''}
      </p>
      <div className="grid gap-1 pl-10">
        {group.options.map((option, index) => {
          const checked = chosen.includes(option.key)
          const id =
            index === 0
              ? questionControlId(first)
              : `${questionControlId(first)}-${option.key}`

          return (
            <Label
              className={cn(
                'rounded-control flex min-h-10 cursor-pointer items-start gap-3 border-2 px-3 py-2 text-[16px] font-normal transition-colors',
                checked
                  ? 'border-manga-red bg-manga-paper-soft'
                  : 'hover:bg-manga-pale-red border-transparent'
              )}
              htmlFor={id}
              key={option.key}
            >
              <Checkbox
                checked={checked}
                className="mt-1"
                disabled={readOnly || (full && !checked)}
                id={id}
                onCheckedChange={next => toggle(option.key, next === true)}
                onFocus={() => onFocusQuestion(first)}
              />
              <span className="leading-[1.6]">
                <strong className="font-sans font-black">{option.key}</strong>{' '}
                {option.text}
              </span>
            </Label>
          )
        })}
      </div>
      {review ? (
        <div className="flex flex-wrap gap-3 pl-10">
          {group.questions.map(question =>
            review[question.number] ? (
              <span
                className="inline-flex items-center gap-1"
                key={question.number}
              >
                <span className="text-sm font-bold">{question.number}:</span>
                <ReviewMark
                  mark={review[question.number]}
                  showAccepted={false}
                />
              </span>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Matching and labelling: a box of options, then one dropdown per item. */
function DropdownQuestions({ group }: Props) {
  const { answers, onFocusQuestion, readOnly, review, setAnswer } =
    useIeltsAnswers()

  return (
    <div className="grid gap-4">
      {group.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Cloudinary image of any size
        <img
          alt={group.title || 'Plan'}
          className="border-manga-black rounded-control max-h-[420px] w-full border-2 object-contain"
          src={group.imageUrl}
        />
      ) : null}
      <div className="border-manga-black bg-manga-pale-red rounded-control grid gap-1.5 border-2 p-3">
        {group.title ? (
          <p className="text-sm font-bold">{group.title}</p>
        ) : null}
        <ul className="grid gap-1">
          {group.options.map(option => (
            <li
              className="flex gap-2 leading-[1.6]"
              key={option.key}
            >
              <strong className="min-w-8 font-sans font-black">
                {option.key}
              </strong>
              <span>{option.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <ol className="grid gap-3">
        {group.questions.map(question => {
          const value = answerText(answers[String(question.number)])
          const promptId = `${questionControlId(question.number)}-prompt`
          const mark = review?.[question.number]

          return (
            <li
              className="grid gap-2"
              id={questionBlockId(question.number)}
              key={question.number}
            >
              <div className="flex flex-wrap items-center gap-3">
                <QuestionNumber number={question.number} />
                <span className="min-w-0 flex-1 font-medium">
                  <span id={promptId}>{question.prompt}</span>{' '}
                  <EvidenceIconButton number={question.number} />
                </span>
                <Select
                  disabled={readOnly}
                  onValueChange={next =>
                    setAnswer(question.number, String(next ?? ''))
                  }
                  value={value}
                >
                  <SelectTrigger
                    aria-labelledby={promptId}
                    className="border-manga-black rounded-tag bg-manga-white min-w-24 border-2 font-semibold"
                    id={questionControlId(question.number)}
                    onFocus={() => onFocusQuestion(question.number)}
                    size="sm"
                  >
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {group.options.map(option => (
                      <SelectItem
                        key={option.key}
                        value={option.key}
                      >
                        {option.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mark ? (
                <div className="pl-10">
                  <ReviewMark mark={mark} />
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Completion: the body with inline blanks, plus prompt-only questions. */
function SlotQuestions({ group }: Props) {
  const bodyId = `ielts-group-${group.id}-body`
  const renderSlot = useCallback(
    (number: number) => (
      <SlotInput
        describedBy={bodyId}
        key={number}
        number={number}
      />
    ),
    [bodyId]
  )
  const promptQuestions = group.questions.filter(question =>
    question.prompt.includes(`{{q${question.number}}}`)
  )

  return (
    <div className="grid gap-4">
      {group.body ? (
        <div
          className="border-manga-black rounded-control bg-manga-white border-2 p-4"
          id={bodyId}
        >
          {group.title ? (
            <p className="mb-3 text-center font-sans font-black">
              {group.title}
            </p>
          ) : null}
          <IeltsMarkdown
            renderSlot={renderSlot}
            source={group.body}
          />
        </div>
      ) : null}
      {promptQuestions.length ? (
        <ol className="grid gap-3">
          {promptQuestions.map(question => (
            <li
              className="leading-[1.9]"
              id={questionBlockId(question.number)}
              key={question.number}
            >
              <IeltsMarkdown
                renderSlot={renderSlot}
                source={question.prompt}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

/**
 * A question group as the learner sees it: "Questions 1-6", the instruction
 * in English, then the widget its type maps to.
 */
export const GroupBlock = memo(function GroupBlock({ group }: Props) {
  const widget = IELTS_QUESTION_WIDGETS[group.type]

  return (
    <section
      aria-labelledby={`ielts-group-${group.id}-title`}
      data-highlight-scope={`group:${group.id}`}
      className="grid gap-3"
    >
      <header className="grid gap-1">
        <h3
          className="font-sans text-base font-black"
          id={`ielts-group-${group.id}-title`}
        >
          {group.from === group.to
            ? `Question ${group.from}`
            : `Questions ${group.from}-${group.to}`}
        </h3>
        <p className="text-manga-black leading-[1.6]">{group.instruction}</p>
      </header>
      {widget === 'slot' ? <SlotQuestions group={group} /> : null}
      {widget === 'radio' ? <RadioQuestions group={group} /> : null}
      {widget === 'checkbox' ? <CheckboxQuestions group={group} /> : null}
      {widget === 'dropdown' ? <DropdownQuestions group={group} /> : null}
    </section>
  )
})
