'use client'

import { memo, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'

import { type IeltsQuestionEntry, isAnswered } from './questionIndex'

interface Props {
  answers: IeltsAnswers
  currentNumber: number | null
  index: IeltsQuestionEntry[]
  onSelect: (entry: IeltsQuestionEntry) => void
  partLabel: (part: number) => string
}

/**
 * Bottom bar like the computer-delivered test: one block per part with its
 * answered count, then the question numbers. Answered = soft blue,
 * current = solid blue. Scrolls sideways on phones with the current number
 * kept in view.
 */
export const QuestionNavigator = memo(function QuestionNavigator({
  answers,
  currentNumber,
  index,
  onSelect,
  partLabel,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const parts = [...new Set(index.map(entry => entry.part))]

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [currentNumber])

  return (
    <nav
      aria-label="Danh sách câu hỏi"
      className="border-ex-line shrink-0 border-t bg-white px-3 py-2"
    >
      <div
        className="flex items-center gap-5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible"
        ref={listRef}
      >
        {parts.map(part => {
          const entries = index.filter(entry => entry.part === part)
          const done = entries.filter(entry => isAnswered(entry, answers))

          return (
            <div
              className="flex shrink-0 items-center gap-1"
              key={part}
            >
              <span className="text-ex-ink mr-1.5 text-xs font-bold whitespace-nowrap">
                {partLabel(part)}
                <span className="text-ex-muted ml-1 font-normal">
                  {done.length}/{entries.length}
                </span>
              </span>
              {entries.map(entry => {
                const answered = isAnswered(entry, answers)
                const current = entry.number === currentNumber

                return (
                  // Navigator chip (aria-current): a plain button by design.
                  <button
                    aria-current={current ? 'true' : undefined}
                    aria-label={`Câu ${entry.number}, ${current ? 'đang chọn' : answered ? 'đã trả lời' : 'chưa trả lời'}`}
                    className={cn(
                      'relative grid h-8 min-w-8 place-items-center rounded-md border px-1 text-[13px] font-semibold tabular-nums transition-colors after:absolute after:-inset-1',
                      current
                        ? 'border-ex-accent bg-ex-accent text-white'
                        : answered
                          ? 'border-ex-accent/30 bg-ex-accent-soft text-ex-accent'
                          : 'border-ex-line text-ex-ink hover:bg-ex-soft bg-white'
                    )}
                    key={entry.number}
                    onClick={() => onSelect(entry)}
                    type="button"
                  >
                    {entry.number}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </nav>
  )
})
