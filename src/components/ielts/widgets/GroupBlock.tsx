'use client'

import { Fragment, memo, useCallback } from 'react'

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
import { toJudgementInstruction } from '@/modules/ielts/judgementInstruction'
import {
  type IeltsPublicGroup,
  optionsInBody,
} from '@/modules/ielts/publicView'
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

/**
 * Picture multiple choice ("Which picture shows ..."): the letters live in
 * the image, so it renders as the image plus a letter dropdown, with no
 * options box. The option texts stay for the editor and review.
 */
export function isPictureChoice(group: IeltsPublicGroup): boolean {
  return group.type === 'multiple-choice' && Boolean(group.imageUrl)
}

/**
 * Groups whose letters are printed on the image (a labelled plan or map, or
 * pictures A-D): the image replaces the options box, as on the real test.
 */
function lettersInImage(group: IeltsPublicGroup): boolean {
  return (
    Boolean(group.imageUrl) &&
    (group.type === 'plan-map-labelling' || group.type === 'multiple-choice')
  )
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
              className={cn(
                'gap-0.5 pl-10',
                isJudgement && 'flex flex-wrap gap-1'
              )}
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
                      'rounded-control flex min-h-9 cursor-pointer items-start gap-3 border-2 px-3 py-1 text-[16px] font-normal transition-colors',
                      isJudgement &&
                        'min-h-8 items-center gap-2 px-2 py-0.5 text-sm whitespace-nowrap',
                      value === option.key
                        ? 'border-manga-red bg-manga-paper-soft'
                        : 'hover:bg-manga-pale-red border-transparent'
                    )}
                    htmlFor={id}
                    key={option.key}
                  >
                    <RadioGroupItem
                      className={isJudgement ? 'size-4' : 'mt-1'}
                      id={id}
                      onFocus={() => onFocusQuestion(question.number)}
                      value={option.key}
                    />
                    <span className="leading-[1.6]">
                      <strong
                        className={cn(
                          'font-sans',
                          isJudgement ? 'font-bold' : 'font-black'
                        )}
                      >
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
      <div className="grid gap-0.5 pl-10">
        {group.options.map((option, index) => {
          const checked = chosen.includes(option.key)
          const id =
            index === 0
              ? questionControlId(first)
              : `${questionControlId(first)}-${option.key}`

          return (
            <Label
              className={cn(
                'rounded-control flex min-h-9 cursor-pointer items-start gap-3 border-2 px-3 py-1 text-[16px] font-normal transition-colors',
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

/** The lettered list the answers are picked from. */
function OptionsBox({
  options,
  title,
}: {
  options: IeltsOption[]
  title?: string
}) {
  return (
    <div className="border-manga-black bg-manga-pale-red rounded-control grid gap-1.5 border-2 p-3">
      {title ? <p className="text-sm font-bold">{title}</p> : null}
      <ul className="grid gap-1">
        {options.map(option => (
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
  )
}

/**
 * Matching and labelling: a box of options (or the labelled image instead),
 * then one dropdown per item.
 */
function DropdownQuestions({ group }: Props) {
  const { answers, onFocusQuestion, readOnly, review, setAnswer } =
    useIeltsAnswers()
  const isPicture = isPictureChoice(group)
  const hideOptions = lettersInImage(group)

  return (
    <div className="grid gap-4">
      {hideOptions && group.title ? (
        <p className="text-center font-sans text-lg font-black">
          {group.title}
        </p>
      ) : null}
      {group.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Cloudinary image of any size
        <img
          alt={group.title || (isPicture ? 'Pictures A to D' : 'Plan')}
          className="border-manga-black rounded-control bg-manga-white max-h-[420px] w-full border-2 object-contain"
          src={group.imageUrl}
        />
      ) : null}
      {hideOptions ? null : (
        <OptionsBox
          options={group.options}
          title={group.title}
        />
      )}
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

/**
 * Completion: the body with inline blanks, plus prompt-only questions. When
 * the answers are letters, each blank is a dropdown and the word box shows
 * under the body unless the body already lists it.
 */
function SlotQuestions({ group }: Props) {
  const bodyId = `ielts-group-${group.id}-body`
  const letters = group.pickLetter ? group.options : undefined
  const renderSlot = useCallback(
    (number: number) => (
      <SlotInput
        describedBy={bodyId}
        key={number}
        number={number}
        options={letters}
      />
    ),
    [bodyId, letters]
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
      {letters && !optionsInBody(group.body).length ? (
        <OptionsBox options={letters} />
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
 * The group instruction. TRUE/FALSE/NOT GIVEN and YES/NO/NOT GIVEN show as
 * on the paper: the question, then a legend of the answer words, instead of
 * one long sentence.
 */
function GroupInstruction({ group }: Props) {
  const judgement = toJudgementInstruction(group.type, group.instruction)

  if (!judgement)
    return <p className="text-manga-black leading-[1.6]">{group.instruction}</p>

  return (
    <div className="text-manga-black grid gap-2 leading-[1.6]">
      <p>{judgement.lead}</p>
      <p>
        In boxes {group.from}
        {group.to > group.from ? `-${group.to}` : ''} on your answer sheet,
        choose
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 pl-3">
        {judgement.legend.map(row => (
          <Fragment key={row.key}>
            <dt className="font-sans font-black whitespace-nowrap">
              {row.key}
            </dt>
            <dd className="italic">{row.meaning}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  )
}

/** A choice group's body (e.g. the worked example) has no answer slots. */
const noSlot = () => null

/**
 * A question group as the learner sees it: "Questions 1-6", the instruction
 * in English, an optional intro such as the worked example, then the widget
 * its type maps to.
 */
export const GroupBlock = memo(function GroupBlock({ group }: Props) {
  const widget = isPictureChoice(group)
    ? 'dropdown'
    : IELTS_QUESTION_WIDGETS[group.type]

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
        <GroupInstruction group={group} />
      </header>
      {widget === 'radio' && group.body ? (
        <IeltsMarkdown
          className="gap-1 pl-4"
          renderSlot={noSlot}
          source={group.body}
        />
      ) : null}
      {widget === 'slot' ? <SlotQuestions group={group} /> : null}
      {widget === 'radio' ? <RadioQuestions group={group} /> : null}
      {widget === 'checkbox' ? <CheckboxQuestions group={group} /> : null}
      {widget === 'dropdown' ? <DropdownQuestions group={group} /> : null}
    </section>
  )
})
