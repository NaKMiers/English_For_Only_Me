'use client'

import { useId } from 'react'

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
  ListField,
  NumberField,
  removeAt,
  replaceAt,
  RowActions,
  TextField,
} from './fields'
import { ImageUploadField } from './ImageUploadField'

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
  return (
    <li className="border-ex-line grid gap-2 border-l-4 pl-3">
      <div className="flex flex-wrap items-end gap-2">
        <NumberField
          className="w-20"
          label="Số câu"
          max={40}
          min={1}
          onChange={number => onChange({ ...question, number })}
          value={question.number}
        />
        <TextField
          className="min-w-48 flex-1"
          label="Prompt (để trống nếu chỗ trống nằm trong body)"
          onChange={prompt => onChange({ ...question, prompt })}
          value={question.prompt}
        />
        <RowActions
          label={`Xoá câu ${question.number}`}
          onRemove={onRemove}
        />
      </div>
      {isMulti ? null : (
        <ListField
          label="Đáp án chấp nhận"
          onChange={answers => onChange({ ...question, answers })}
          value={question.answers}
        />
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
        <TextField
          label="Bằng chứng (trích nguyên văn)"
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
          label="Đoạn / dòng (từ 0)"
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
        label="Giải thích"
        onChange={explanation => onChange({ ...question, explanation })}
        value={question.explanation}
      />
    </li>
  )
}

export function GroupEditor({ group, index, onChange, onRemove }: Props) {
  const widget = IELTS_QUESTION_WIDGETS[group.type]
  const isMulti = group.type === 'multiple-choice-multi'
  const usesOptions =
    widget !== 'slot' &&
    group.type !== 'true-false-not-given' &&
    group.type !== 'yes-no-not-given'
  const allowNumberId = useId()
  const update = (next: Partial<IeltsQuestionGroup>) =>
    onChange(withRange({ ...group, ...next }))
  const lastNumber = group.questions.at(-1)?.number ?? group.from - 1

  return (
    <fieldset className="border-ex-line grid gap-3 rounded-lg border bg-white p-3">
      <legend className="px-1 font-sans text-sm font-bold">
        Nhóm {index + 1} · Questions {group.from}-{group.to}
      </legend>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid min-w-56 flex-1 gap-1">
          <span className="font-sans text-xs font-bold">Dạng câu</span>
          <Select
            onValueChange={value =>
              update({ type: (value ?? group.type) as IeltsQuestionType })
            }
            value={group.type}
          >
            <SelectTrigger
              aria-label="Dạng câu"
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
        <RowActions
          label={`Xoá nhóm ${index + 1}`}
          onRemove={onRemove}
        />
      </div>
      <AreaField
        label="Hướng dẫn (tiếng Anh)"
        onChange={instruction => update({ instruction })}
        rows={2}
        value={group.instruction}
      />
      {widget === 'slot' ? (
        <div className="flex flex-wrap items-end gap-3">
          <NumberField
            className="w-28"
            label="Tối đa số từ"
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
      <TextField
        label="Tiêu đề nhóm (tuỳ chọn)"
        onChange={title => update({ title })}
        value={group.title}
      />
      {widget === 'slot' ? (
        <AreaField
          hint="Markdown: # tiêu đề, - gạch đầu dòng, | bảng |, **đậm**, *nghiêng*, {{q12}} là chỗ trống câu 12. Không dùng HTML."
          label="Nội dung (body)"
          onChange={body => update({ body })}
          rows={8}
          value={group.body}
        />
      ) : null}
      {group.type === 'plan-map-labelling' ? (
        <ImageUploadField
          label="Ảnh sơ đồ / bản đồ"
          onChange={imageUrl => update({ imageUrl })}
          value={group.imageUrl}
        />
      ) : null}
      {usesOptions ? (
        <div className="grid gap-2">
          <p className="font-sans text-xs font-bold">Lựa chọn</p>
          <ol className="grid gap-2">
            {group.options.map((option, optionIndex) => (
              <li
                className="flex items-end gap-2"
                key={optionIndex}
              >
                <TextField
                  className="w-20"
                  label="Mã"
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
                  className="flex-1"
                  label="Nội dung"
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
                  label={`Xoá lựa chọn ${option.key}`}
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
            Thêm lựa chọn
          </AddButton>
        </div>
      ) : null}
      {isMulti ? (
        <ListField
          label={`Các mã đúng (đủ ${group.questions.length})`}
          onChange={correctKeys => update({ correctKeys })}
          separator=","
          value={group.correctKeys}
        />
      ) : null}
      <div className="grid gap-2">
        <p className="font-sans text-xs font-bold">Câu hỏi</p>
        <ol className="grid gap-4">
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
                update({ questions: removeAt(group.questions, questionIndex) })
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
          Thêm câu
        </AddButton>
      </div>
    </fieldset>
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
