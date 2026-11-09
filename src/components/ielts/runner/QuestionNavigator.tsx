'use client'

import { ChevronUp, ListChecks } from 'lucide-react'
import { memo, useState } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'

import { type IeltsQuestionEntry, isAnswered } from './questionIndex'
import {
  PartSwitcher,
  RunnerFooter,
  type SkillLinkTarget,
} from './RunnerFooter'

interface Props {
  answers: IeltsAnswers
  currentNumber: number | null
  currentPart: number
  index: IeltsQuestionEntry[]
  next?: SkillLinkTarget | null
  onPartChange: (part: number) => void
  onSelect: (entry: IeltsQuestionEntry) => void
  partLabel: (part: number) => string
  prev?: SkillLinkTarget | null
}

/**
 * The reading / listening bottom bar: a Questions button with the answered
 * count that folds out the current part's question numbers, and a joined
 * 1 2 3 4 part switcher, between the skill links. Answered numbers are soft
 * red, the current one solid red; a part with every question answered gets a
 * dot.
 */
export const QuestionNavigator = memo(function QuestionNavigator({
  answers,
  currentNumber,
  currentPart,
  index,
  next = null,
  onPartChange,
  onSelect,
  partLabel,
  prev = null,
}: Props) {
  const [open, setOpen] = useState(false)
  const parts = [...new Set(index.map(entry => entry.part))]
  const answeredTotal = index.filter(entry => isAnswered(entry, answers)).length
  const partEntries = index.filter(entry => entry.part === currentPart)

  return (
    <RunnerFooter
      next={next}
      prev={prev}
      top={
        open ? (
          <div
            className="mx-auto mb-2 flex max-w-3xl flex-wrap justify-center gap-1.5"
            id="question-numbers"
          >
            {partEntries.map(entry => {
              const answered = isAnswered(entry, answers)
              const current = entry.number === currentNumber

              return (
                // Navigator chip (aria-current): a plain button by design.
                <button
                  aria-current={current ? 'true' : undefined}
                  aria-label={`Question ${entry.number}, ${current ? 'current' : answered ? 'answered' : 'not answered'}`}
                  className={cn(
                    'rounded-tag grid size-9 place-items-center border-2 font-sans text-[13px] font-black tabular-nums transition-colors',
                    current
                      ? 'border-manga-red bg-manga-red text-manga-white'
                      : answered
                        ? 'border-manga-red/30 bg-manga-paper-soft text-manga-red'
                        : 'border-manga-black bg-manga-white text-manga-black hover:bg-manga-pale-red'
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
        ) : null
      }
    >
      {/* Disclosure toggle (aria-expanded): a plain button by design. */}
      <button
        aria-controls="question-numbers"
        aria-expanded={open}
        className="border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control inline-flex h-9 items-center gap-2 border-2 px-2.5 font-sans text-sm font-black transition-colors sm:px-3"
        onClick={() => setOpen(value => !value)}
        type="button"
      >
        {/* Icon-only label on phones, so the next-skill link still fits. */}
        <ListChecks
          aria-hidden="true"
          className="size-4 sm:hidden"
        />
        <span className="max-sm:sr-only">Questions</span>
        <span className="text-manga-ink-soft text-xs tabular-nums">
          {answeredTotal}/{index.length}
        </span>
        <ChevronUp
          aria-hidden="true"
          className={cn(
            'size-4 transition-transform max-sm:hidden',
            !open && 'rotate-180'
          )}
        />
      </button>

      {parts.length > 1 ? (
        <PartSwitcher
          current={currentPart}
          items={parts.map(part => {
            const entries = index.filter(entry => entry.part === part)
            const done = entries.filter(entry =>
              isAnswered(entry, answers)
            ).length

            return {
              done: done === entries.length && entries.length > 0,
              label: `${partLabel(part)}, ${done} of ${entries.length} answered`,
              part,
              title: `${partLabel(part)}: ${done}/${entries.length} answered`,
            }
          })}
          onChange={onPartChange}
        />
      ) : null}
    </RunnerFooter>
  )
})
