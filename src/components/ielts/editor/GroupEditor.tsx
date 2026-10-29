'use client'

import { CircleAlert } from 'lucide-react'
import { useId, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  IELTS_QUESTION_TYPE_LABELS,
  IELTS_QUESTION_TYPES,
  IELTS_QUESTION_WIDGETS,
  type IeltsQuestionType,
} from '@/modules/ielts/constants'
import type { IeltsQuestion, IeltsQuestionGroup } from '@/modules/ielts/schema'

import {
  AddButton,
  AreaField,
  Disclosure,
  ListField,
  MetaChip,
  NumberField,
  removeAt,
  replaceAt,
  RowActions,
  TextField,
} from './fields'
import { ImageUploadField } from './ImageUploadField'
import { segmentClass } from '@/components/ielts/ui'

interface Props {
  group: IeltsQuestionGroup
  index: number
  onChange: (group: IeltsQuestionGroup) => void
  onRemove: () => void
}

/** from/to always follow the question numbers. */
export function withRange(group: IeltsQuestionGroup): IeltsQuestionGroup {
  const numbers = group.questions.map(question => question.number)

  return numbers.length
    ? { ...group, from: Math.min(...numbers), to: Math.max(...numbers) }
    : group
}

export function newGroup(nextNumber: number): IeltsQuestionGroup {
  return {
    id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: 'note-completion',
    from: nextNumber,
    to: nextNumber,
    instruction:
      'Complete the notes below. Write ONE WORD ONLY for each answer.',
    wordLimit: { maxWords: 1, allowNumber: false },
    title: '',
    body: `- {{q${nextNumber}}}`,
    options: [],
    correctKeys: [],
    imageUrl: '',
    questions: [newQuestion(nextNumber)],
  }
}

function newQuestion(number: number): IeltsQuestion {
  return {
    number,
    prompt: '',
    answers: [],
    evidence: null,
    explanation: '',
  }
}

function QuestionEditor({
  isMulti,
  onChange,
  onRemove,
  question,
}: {
  isMulti: boolean
  onChange: (question: IeltsQuestion) => void
  onRemove: () => void
  question: IeltsQuestion
}) {
  const missingAnswer = !isMulti && question.answers.length === 0
  const missingEvidence = !question.evidence?.quote

  return (
    <li>
      <Disclosure
        actions={
          <RowActions
            label={`Remove question ${question.number}`}
            onRemove={onRemove}
          />
        }
        defaultOpen={missingAnswer && !question.prompt}
        meta={
          <>
            {missingAnswer ? (
              <MetaChip tone="warn">
                <CircleAlert aria-hidden="true" />
                No answer
              </MetaChip>
            ) : isMulti ? null : (
              <span className="text-manga-black truncate font-bold">
                {question.answers.join(' | ')}
              </span>
            )}
            {missingEvidence ? (
              <MetaChip tone="warn">No evidence</MetaChip>
            ) : null}
            {question.prompt ? (
              <span className="truncate">{question.prompt}</span>
            ) : null}
          </>
        }
        title={`Q${question.number}`}
        variant="rail"
      >
        <div className="flex flex-wrap items-end gap-2">
          <NumberField
            className="w-20"
            label="No."
            max={40}
            min={1}
            onChange={number => onChange({ ...question, number })}
            value={question.number}
          />
          <TextField
            className="min-w-48 flex-1"
            label="Prompt (leave blank if the gap is in the body)"
            onChange={prompt => onChange({ ...question, prompt })}
            value={question.prompt}
          />
        </div>
        {isMulti ? null : (
          <ListField
            label="Accepted answers"
            onChange={answers => onChange({ ...question, answers })}
            value={question.answers}
          />
        )}
        <div className="grid gap-2 @md:grid-cols-[1fr_7rem]">
          <TextField
            label="Evidence (verbatim quote)"
            onChange={quote =>
              onChange({
                ...question,
                evidence: quote
                  ? { quote, blockIndex: question.evidence?.blockIndex ?? 0 }
                  : null,
              })
            }
            value={question.evidence?.quote ?? ''}
          />
          <NumberField
            label="Block (from 0)"
            min={0}
            onChange={blockIndex =>
              onChange({
                ...question,
                evidence: { quote: question.evidence?.quote ?? '', blockIndex },
              })
            }
            value={question.evidence?.blockIndex ?? 0}
          />
        </div>
        <TextField
          label="Explanation"
          onChange={explanation => onChange({ ...question, explanation })}
          value={question.explanation}
        />
      </Disclosure>
    </li>
  )
}

type GroupTab = 'setup' | 'options' | 'questions'

/**
 * One question group as a collapsible card: the header names its range,
 * type and size; inside, three tabs keep the setup (type, instructions,
 * body), the options and the question list apart so only one is on screen.
 * A brand-new group opens on its own.
 */
export function GroupEditor({ group, index, onChange, onRemove }: Props) {
  const widget = IELTS_QUESTION_WIDGETS[group.type]
  const isMulti = group.type === 'multiple-choice-multi'
  const usesOptions =
    widget !== 'slot' &&
    group.type !== 'true-false-not-given' &&
    group.type !== 'yes-no-not-given'
  const allowNumberId = useId()
  const [tab, setTab] = useState<GroupTab>('setup')
  const update = (next: Partial<IeltsQuestionGroup>) =>
    onChange(withRange({ ...group, ...next }))
  const lastNumber = group.questions.at(-1)?.number ?? group.from - 1
  const missing = group.questions.filter(
    question => !isMulti && question.answers.length === 0
  ).length
  const isNew =
    group.questions.every(question => question.answers.length === 0) &&
    group.correctKeys.length === 0
  const tabs: { value: GroupTab; label: string }[] = [
    { value: 'setup', label: 'Setup' },
    ...(usesOptions
      ? [
          {
            value: 'options' as const,
            label: `Options (${group.options.length})`,
          },
        ]
      : []),
    { value: 'questions', label: `Questions (${group.questions.length})` },
  ]
  // Switching the type away from an options type hides that tab.
  const activeTab = tab === 'options' && !usesOptions ? 'setup' : tab

  return (
    <Disclosure
      actions={
        <RowActions
          label={`Remove group ${index + 1}`}
          onRemove={onRemove}
        />
      }
      defaultOpen={isNew}
      meta={
        <>
          <span className="text-manga-black truncate font-bold">
            {IELTS_QUESTION_TYPE_LABELS[group.type]}
          </span>
          {missing ? (
            <MetaChip tone="warn">
              <CircleAlert aria-hidden="true" />
              {missing} no answer
            </MetaChip>
          ) : null}
        </>
      }
      title={
        <span className="tabular-nums">
          Q{group.from}
          {group.to > group.from ? `-${group.to}` : ''}
        </span>
      }
    >
      <div
        aria-label={`Group ${index + 1} parts`}
        className="flex flex-wrap gap-1.5"
        role="group"
      >
        {tabs.map(item => (
          // Segmented toggle (aria-pressed): documented raw exception.
          <button
            aria-pressed={activeTab === item.value}
            className={segmentClass(
              activeTab === item.value,
              'min-h-8 px-2.5 text-xs'
            )}
            key={item.value}
            onClick={() => setTab(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === 'setup' ? (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <span className="font-sans text-xs font-black">Question type</span>
            <Select
              onValueChange={value =>
                update({ type: (value ?? group.type) as IeltsQuestionType })
              }
              value={group.type}
            >
              <SelectTrigger
                aria-label="Question type"
                className="w-full"
                size="sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IELTS_QUESTION_TYPES.map(type => (
                  <SelectItem
                    key={type}
                    value={type}
                  >
                    {IELTS_QUESTION_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AreaField
            label="Instructions (in English)"
            onChange={instruction => update({ instruction })}
            rows={2}
            value={group.instruction}
          />
          <div className="grid gap-3 @md:grid-cols-[minmax(0,1fr)_auto] @md:items-end">
            <TextField
              label="Group title (optional)"
              onChange={title => update({ title })}
              value={group.title}
            />
            {widget === 'slot' ? (
              <div className="flex flex-wrap items-end gap-3">
                <NumberField
                  className="w-24"
                  label="Max words"
                  max={5}
                  min={0}
                  onChange={maxWords =>
                    update({
                      wordLimit: maxWords
                        ? {
                            maxWords,
                            allowNumber: group.wordLimit?.allowNumber ?? false,
                          }
                        : null,
                    })
                  }
                  value={group.wordLimit?.maxWords ?? 0}
                />
                <Label
                  className="flex min-h-10 items-center gap-2 text-sm font-semibold"
                  htmlFor={allowNumberId}
                >
                  <Checkbox
                    checked={group.wordLimit?.allowNumber ?? false}
                    disabled={!group.wordLimit}
                    id={allowNumberId}
                    onCheckedChange={checked =>
                      group.wordLimit &&
                      update({
                        wordLimit: {
                          ...group.wordLimit,
                          allowNumber: checked === true,
                        },
                      })
                    }
                  />
                  AND/OR A NUMBER
                </Label>
              </div>
            ) : null}
          </div>
          {widget === 'slot' ? (
            <AreaField
              hint="Markdown: # heading, - bullet, | table |, **bold**, *italic*, {{q12}} is the gap for question 12. No HTML."
              label="Text (body)"
              onChange={body => update({ body })}
              rows={8}
              value={group.body}
            />
          ) : null}
          {group.type === 'plan-map-labelling' ? (
            <ImageUploadField
              label="Plan / map image"
              onChange={imageUrl => update({ imageUrl })}
              value={group.imageUrl}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === 'options' ? (
        <div className="grid gap-2">
          <ol className="grid gap-2">
            {group.options.map((option, optionIndex) => (
              <li
                className="flex items-end gap-2"
                key={optionIndex}
              >
                <TextField
                  className="w-16"
                  label="Key"
                  onChange={key =>
                    update({
                      options: replaceAt(group.options, optionIndex, {
                        ...option,
                        key,
                      }),
                    })
                  }
                  value={option.key}
                />
                <TextField
                  className="min-w-0 flex-1"
                  label="Text"
                  onChange={text =>
                    update({
                      options: replaceAt(group.options, optionIndex, {
                        ...option,
                        text,
                      }),
                    })
                  }
                  value={option.text}
                />
                <RowActions
                  label={`Remove option ${option.key}`}
                  onRemove={() =>
                    update({ options: removeAt(group.options, optionIndex) })
                  }
                />
              </li>
            ))}
          </ol>
          <AddButton
            onClick={() =>
              update({
                options: [
                  ...group.options,
                  {
                    key:
                      group.type === 'matching-headings'
                        ? romanNumeral(group.options.length + 1)
                        : String.fromCharCode(65 + group.options.length),
                    text: '',
                  },
                ],
              })
            }
          >
            Add option
          </AddButton>
          {isMulti ? (
            <ListField
              label={`Correct keys (exactly ${group.questions.length})`}
              onChange={correctKeys => update({ correctKeys })}
              separator=","
              value={group.correctKeys}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === 'questions' ? (
        <div className="grid gap-2">
          <ol className="grid gap-1">
            {group.questions.map((question, questionIndex) => (
              <QuestionEditor
                isMulti={isMulti}
                key={questionIndex}
                onChange={next =>
                  update({
                    questions: replaceAt(group.questions, questionIndex, next),
                  })
                }
                onRemove={() =>
                  update({
                    questions: removeAt(group.questions, questionIndex),
                  })
                }
                question={question}
              />
            ))}
          </ol>
          <AddButton
            onClick={() =>
              update({
                questions: [...group.questions, newQuestion(lastNumber + 1)],
              })
            }
          >
            Add question
          </AddButton>
        </div>
      ) : null}
    </Disclosure>
  )
}

const ROMANS = [
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
]

function romanNumeral(value: number) {
  return ROMANS[value - 1] ?? String(value)
}
