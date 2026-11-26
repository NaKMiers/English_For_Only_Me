'use client'

import { ArrowDown } from 'lucide-react'
import { Fragment, memo, type ReactNode, useCallback } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
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
import { flowChartSteps } from '@/modules/ielts/flowChart'
import { toJudgementInstruction } from '@/modules/ielts/judgementInstruction'
import { formatInstruction } from '@/modules/ielts/instructionText'
import { onlyNamesSections } from '@/modules/ielts/sectionLetterOptions'
import type { GroupHeaderRange } from '@/modules/ielts/sharedGroupHeaders'
import {
  type IeltsPublicGroup,
  bodyWithoutOptions,
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
import { QuestionNumberBadge } from './QuestionNumberBadge'
import { ReviewMark } from './ReviewMark'
import { SlotInput } from './SlotInput'

interface Props {
  group: IeltsPublicGroup
  /**
   * The questions header from `sharedGroupHeaders`: a wider range when this
   * group leads a run of one-question choice groups, null when an earlier
   * group's header already covers it. Omitted: the group's own range.
   */
  header?: GroupHeaderRange
  /** The part's title; a choice group title equal to it is not shown. */
  sectionTitle?: string
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
  return <QuestionNumberBadge number={number} />
}

/**
 * One answer choice: only the radio or checkbox picks it. The text is plain,
 * selectable copy (it names the control through `aria-labelledby`) so the
 * learner can select and highlight it like the passage.
 */
function OptionRow({
  children,
  control,
  nowrap = false,
  selected,
  textId,
}: {
  children: ReactNode
  control: ReactNode
  nowrap?: boolean
  selected: boolean
  textId: string
}) {
  return (
    <div
      className={cn(
        'rounded-control flex items-start gap-3 border-2 px-2 py-0',
        // TRUE / FALSE / NOT GIVEN chips: one compact row.
        nowrap && 'items-center gap-2 px-1.5 text-sm whitespace-nowrap',
        selected ? 'border-exam-line bg-manga-paper-soft' : 'border-transparent'
      )}
      data-option
    >
      {control}
      <span
        className="cursor-text leading-[1.55]"
        id={textId}
      >
        {children}
      </span>
    </div>
  )
}

// Rows now touch: the control's padded hit area stays inside its own row.
const OPTION_CONTROL_CLASS = 'hover:bg-manga-pale-red mt-[3px] after:-inset-y-1'

/** One question, one letter: MC with a single answer, TFNG, YNNG. */
function RadioQuestions({ group }: Props) {
  const { answers, onFocusQuestion, readOnly, review, setAnswer } =
    useIeltsAnswers()
  const options = optionsFor(group)
  const isJudgement = group.type !== 'multiple-choice'

  return (
    <ol className="grid gap-4">
      {group.questions.map(question => {
        const value = answerText(answers[String(question.number)])
        const promptId = `${questionControlId(question.number)}-prompt`
        const mark = review?.[question.number]

        return (
          <li
            className="grid gap-1.5"
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
                'gap-0 pl-8',
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
                  <OptionRow
                    control={
                      <RadioGroupItem
                        aria-labelledby={`${id}-text`}
                        className={cn(
                          OPTION_CONTROL_CLASS,
                          isJudgement && 'mt-0 size-4'
                        )}
                        id={id}
                        onFocus={() => onFocusQuestion(question.number)}
                        value={option.key}
                      />
                    }
                    key={option.key}
                    nowrap={isJudgement}
                    selected={value === option.key}
                    textId={`${id}-text`}
                  >
                    <strong className="font-sans font-black">
                      {option.key}
                    </strong>
                    {option.text ? ` ${option.text}` : ''}
                  </OptionRow>
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
      className="grid gap-1.5"
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
      <div className="grid gap-0 pl-8">
        {group.options.map((option, index) => {
          const checked = chosen.includes(option.key)
          const id =
            index === 0
              ? questionControlId(first)
              : `${questionControlId(first)}-${option.key}`

          return (
            <OptionRow
              control={
                <Checkbox
                  aria-labelledby={`${id}-text`}
                  checked={checked}
                  className={OPTION_CONTROL_CLASS}
                  disabled={readOnly || (full && !checked)}
                  id={id}
                  onCheckedChange={next => toggle(option.key, next === true)}
                  onFocus={() => onFocusQuestion(first)}
                />
              }
              key={option.key}
              selected={checked}
              textId={`${id}-text`}
            >
              <strong className="font-sans font-black">{option.key}</strong>{' '}
              {option.text}
            </OptionRow>
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
  className,
  options,
  title,
}: {
  className?: string
  options: IeltsOption[]
  title?: string
}) {
  // Centered and only as wide as its longest option, as the paper sets a
  // word box or a matching list.
  return (
    <div
      className={cn(
        'border-manga-black bg-exam-tint rounded-control mx-auto grid w-fit max-w-full min-w-40 gap-1 border-2 px-3 py-1.5',
        className
      )}
    >
      {title ? (
        <p className="mb-1 text-center font-sans text-lg leading-tight font-black">
          {title}
        </p>
      ) : null}
      <ul className="grid gap-0.5">
        {options.map(option => (
          <li
            className="flex gap-2 leading-[1.5]"
            key={option.key}
          >
            <strong className="min-w-5 font-sans font-black">
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
  // "Which section contains ...": the letters are the passage's own
  // sections, so the paper prints no box.
  const hideBox = hideOptions || onlyNamesSections(group.options)

  return (
    <div className="grid gap-3">
      {hideOptions && group.title ? (
        <p className="mb-2 text-center font-sans text-xl leading-tight font-black">
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
      {hideBox ? null : (
        <OptionsBox
          options={group.options}
          title={group.title}
        />
      )}
      <ol className="grid gap-2">
        {group.questions.map(question => {
          const value = answerText(answers[String(question.number)])
          const promptId = `${questionControlId(question.number)}-prompt`
          const mark = review?.[question.number]

          return (
            <li
              className="grid gap-1"
              id={questionBlockId(question.number)}
              key={question.number}
            >
              <div className="flex flex-wrap items-center gap-3">
                <QuestionNumber number={question.number} />
                <span className="min-w-0 font-medium">
                  <span id={promptId}>{question.prompt}</span>{' '}
                  <EvidenceIconButton number={question.number} />
                </span>
                <Select
                  disabled={readOnly}
                  onValueChange={next =>
                    setAnswer(question.number, String(next ?? ''))
                  }
                  // Null shows the "-" placeholder; there is no blank item
                  // to pick, so a chosen letter can only change, not clear.
                  value={value || null}
                >
                  <SelectTrigger
                    aria-labelledby={promptId}
                    className="border-manga-black rounded-tag bg-manga-white min-w-24 border font-semibold"
                    id={questionControlId(question.number)}
                    onFocus={() => onFocusQuestion(question.number)}
                    size="sm"
                  >
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
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
  // A word box listed inside the summary shows as its own box above it,
  // as on the paper, instead of a bullet list under the text.
  const body = letters ? bodyWithoutOptions(group.body, letters) : group.body
  const flowSteps = flowChartSteps(body)

  return (
    <div className="grid gap-3">
      {/* "Label the diagram(s) below": the paper's picture, then the notes
          that hold the blanks. */}
      {group.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Cloudinary image of any size
        <img
          alt={group.title || 'Diagram'}
          className="border-manga-black rounded-control bg-manga-white max-h-[560px] w-full border object-contain"
          src={group.imageUrl}
        />
      ) : null}
      {letters ? <OptionsBox options={letters} /> : null}
      {body ? (
        <div
          className="border-manga-black rounded-control bg-manga-white border-2 px-2.5 py-5"
          id={bodyId}
        >
          {group.title ? (
            <p className="mb-2 text-center font-sans text-xl leading-tight font-black">
              {group.title}
            </p>
          ) : null}
          {flowSteps ? (
            // Flow chart: each step in its own box, an arrow between boxes.
            <div className="grid gap-1">
              {flowSteps.map((step, index) => (
                <Fragment key={index}>
                  {index ? (
                    <ArrowDown
                      aria-hidden="true"
                      className="mx-auto size-5"
                    />
                  ) : null}
                  <IeltsMarkdown
                    className="border-manga-black rounded-control gap-1 border px-3 py-2"
                    renderSlot={renderSlot}
                    source={step}
                  />
                </Fragment>
              ))}
            </div>
          ) : (
            <IeltsMarkdown
              renderSlot={renderSlot}
              source={body}
            />
          )}
        </div>
      ) : null}
      {promptQuestions.length ? (
        <ol className="grid gap-1.5">
          {promptQuestions.map(question => (
            <li
              className="leading-[1.65]"
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
    return (
      <div className="text-manga-black grid gap-1 leading-[1.6]">
        {formatInstruction(group.instruction).map((line, index) => (
          <p key={index}>
            {line.map((part, partIndex) =>
              part.bold ? (
                <strong
                  className="font-black"
                  key={partIndex}
                >
                  {part.text}
                </strong>
              ) : (
                part.text
              )
            )}
          </p>
        ))}
      </div>
    )

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

const flatTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * "Which TWO benefits ...?" stored both as the group title and as the
 * question: the paper prints it once, so the title steps aside.
 */
function titleRepeatsPrompt(group: IeltsPublicGroup): boolean {
  const title = flatTitle(group.title)

  return group.questions.some(question => {
    const prompt = flatTitle(question.prompt)

    return Boolean(prompt) && (prompt.includes(title) || title.includes(prompt))
  })
}

/** "Question 5", "Questions 21 and 22", "Questions 1-6", as on the paper. */
function questionsLabel({ from, to }: { from: number; to: number }): string {
  if (from === to) return `Question ${from}`
  if (to === from + 1) return `Questions ${from} and ${to}`

  return `Questions ${from}-${to}`
}

/** A choice group's body (e.g. the worked example) has no answer slots. */
const noSlot = () => null

/**
 * A question group as the learner sees it: "Questions 1-6", the instruction
 * in English, an optional intro such as the worked example, then the widget
 * its type maps to.
 */
export const GroupBlock = memo(function GroupBlock({
  group,
  header = { from: group.from, to: group.to },
  sectionTitle = '',
}: Props) {
  const widget = isPictureChoice(group)
    ? 'dropdown'
    : IELTS_QUESTION_WIDGETS[group.type]

  return (
    <section
      aria-labelledby={`ielts-group-${group.id}-title`}
      data-highlight-scope={`group:${group.id}`}
      className="grid gap-3"
    >
      {header ? (
        <header className="grid gap-0.5">
          <h3
            className="font-sans text-base font-black"
            id={`ielts-group-${group.id}-title`}
          >
            {questionsLabel(header)}
          </h3>
          <GroupInstruction group={group} />
        </header>
      ) : (
        <h3
          className="sr-only"
          id={`ielts-group-${group.id}-title`}
        >
          {questionsLabel(group)}
        </h3>
      )}
      {/* Fill-in and matching draw the title inside their own box; choice
          groups have none, so their title ("Local council report on
          traffic and highways") heads the questions here. */}
      {(widget === 'radio' || widget === 'checkbox') &&
      group.title &&
      flatTitle(group.title) !== flatTitle(sectionTitle) &&
      !titleRepeatsPrompt(group) ? (
        <p className="mb-2 text-center font-sans text-xl leading-tight font-black">
          {group.title}
        </p>
      ) : null}
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
