'use client'

import { memo, type ReactNode } from 'react'

import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'

import { type IeltsQuestionEntry, isAnswered } from './questionIndex'
import {
  PartSwitcher,
  RunnerFooter,
  type SkillLinkTarget,
} from './RunnerFooter'

interface Props {
  /** Pinned to the right end of the bar from 1024px (Check part). */
  action?: ReactNode
  answers: IeltsAnswers
  currentPart: number
  /** Flagged questions: counted per part and marked on its button. */
  flagged?: ReadonlySet<number>
  index: IeltsQuestionEntry[]
  next?: SkillLinkTarget | null
  onPartChange: (part: number) => void
  partLabel: (part: number) => string
  prev?: SkillLinkTarget | null
}

/**
 * The reading / listening bottom bar: a joined 1 2 3 4 part switcher between
 * the skill links. A part with every question answered gets a dot.
 */
export const QuestionNavigator = memo(function QuestionNavigator({
  action = null,
  answers,
  currentPart,
  flagged,
  index,
  next = null,
  onPartChange,
  partLabel,
  prev = null,
}: Props) {
  const parts = [...new Set(index.map(entry => entry.part))]

  return (
    <RunnerFooter
      action={action}
      next={next}
      prev={prev}
    >
      {parts.length > 1 ? (
        <PartSwitcher
          current={currentPart}
          items={parts.map(part => {
            const entries = index.filter(entry => entry.part === part)
            const done = entries.filter(entry =>
              isAnswered(entry, answers)
            ).length
            const flags = entries.filter(entry =>
              flagged?.has(entry.number)
            ).length
            const flagNote = flags ? `, ${flags} flagged` : ''

            return {
              done: done === entries.length && entries.length > 0,
              flagged: flags > 0,
              label: `${partLabel(part)}, ${done} of ${entries.length} answered${flagNote}`,
              part,
              title: `${partLabel(part)}: ${done}/${entries.length} answered${flagNote}`,
            }
          })}
          onChange={onPartChange}
        />
      ) : null}
    </RunnerFooter>
  )
})
