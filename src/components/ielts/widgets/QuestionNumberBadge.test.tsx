import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
} from './answerContext'
import { QuestionNumberBadge } from './QuestionNumberBadge'

afterEach(cleanup)

const base: IeltsAnswerContextValue = {
  answers: {},
  readOnly: false,
  review: null,
  setAnswer: () => undefined,
  currentNumber: null,
  onFocusQuestion: () => undefined,
  onShowEvidence: null,
}

const renderBadge = (value: Partial<IeltsAnswerContextValue>) =>
  render(
    <IeltsAnswerContext.Provider value={{ ...base, ...value }}>
      <QuestionNumberBadge number={7} />
    </IeltsAnswerContext.Provider>
  )

describe('QuestionNumberBadge', () => {
  it('flags the question when its number is clicked', () => {
    const onToggleFlag = vi.fn()

    renderBadge({ onToggleFlag })
    fireEvent.click(screen.getByRole('button', { name: 'Flag question 7' }))

    expect(onToggleFlag).toHaveBeenCalledWith(7)
  })

  it('shows a flagged question as pressed', () => {
    renderBadge({ flagged: new Set([7]), onToggleFlag: () => undefined })

    expect(
      screen.getByRole('button', { name: 'Unflag question 7' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('is plain text when flags are off (review)', () => {
    renderBadge({})

    expect(screen.queryByRole('button')).toBeNull()
  })
})
