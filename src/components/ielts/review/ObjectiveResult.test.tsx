import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import type { IeltsReviewRow } from '@/modules/ielts/services/resultPageData'

import { ObjectiveResult } from './ObjectiveResult'

vi.mock('../catalogue/DrillButton', () => ({
  DrillButton: () => <button type="button">Drill</button>,
}))
vi.mock('./SaveWordButton', () => ({
  SaveWordButton: () => <button type="button">Save</button>,
}))

const attempt = {
  deadlineAt: null,
  skill: 'reading',
  status: 'scored',
  submittedAt: null,
} as unknown as IeltsAttemptRecord

function row(
  number: number,
  outcome: IeltsReviewRow['outcome'],
  explanation: string
): IeltsReviewRow {
  return {
    accepted: ['harbour'],
    evidence: null,
    explanation,
    given: outcome === 'blank' ? '' : 'harbor bay',
    number,
    outcome,
    overLimit: false,
    part: 1,
    sectionKey: 'r1',
    type: 'sentence-completion',
  } as IeltsReviewRow
}

const rows = [
  row(1, 'wrong', 'The text says harbour.'),
  row(2, 'correct', 'Paragraph B.'),
]

describe('ObjectiveResult', () => {
  test('the Wrong filter opens every explanation without a click', () => {
    render(
      <ObjectiveResult
        attempt={attempt}
        rows={rows}
        sections={[]}
      />
    )

    expect(screen.getByText('The text says harbour.')).toBeVisible()
    // No fold buttons in this filter.
    expect(document.querySelector('[aria-expanded]')).toBeNull()
  })

  test('All folds each row, and the whole row opens it', () => {
    render(
      <ObjectiveResult
        attempt={attempt}
        rows={rows}
        sections={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.queryByText('Paragraph B.')).toBeNull()

    const trigger = document.querySelector(
      '[data-review-row="2"] button[aria-expanded]'
    ) as HTMLElement
    fireEvent.click(trigger)
    expect(screen.getByText('Paragraph B.')).toBeVisible()
  })

  test('the key stands out, the wrong answer is struck, mark words are sr-only', () => {
    render(
      <ObjectiveResult
        attempt={attempt}
        rows={rows}
        sections={[]}
      />
    )

    const wrongRow = document.querySelector('[data-review-row="1"]')!
    expect(wrongRow.querySelector('.line-through')?.textContent).toContain(
      'harbor bay'
    )
    expect(
      wrongRow.querySelector('.text-lesson-correct')?.textContent
    ).toContain('harbour')
    const markWord = [...wrongRow.querySelectorAll('span')]
      .filter(element => element.textContent === 'Wrong')
      .at(-1)
    expect(markWord?.className).toContain('sr-only')
    // No wide table that scrolls sideways.
    expect(document.querySelector('table')).toBeNull()
  })

  test('what to drill sits in the Answers header, no separate Next card', () => {
    render(
      <ObjectiveResult
        attempt={attempt}
        rows={rows}
        sections={[]}
      />
    )

    expect(screen.queryByText('Next')).toBeNull()
    expect(screen.getByRole('button', { name: 'Drill' })).toBeInTheDocument()
  })
})
