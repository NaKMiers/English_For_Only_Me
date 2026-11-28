import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { IeltsAnswerContext } from '../widgets/answerContext'
import { EvidenceIconButton } from '../widgets/EvidenceIconButton'

import { CheckPartPanel } from './CheckPartPanel'

describe('CheckPartPanel', () => {
  test('a failed check shows its error in the panel, outside the hidden button row', () => {
    render(
      <CheckPartPanel
        check={null}
        checking={false}
        className="lg:hidden"
        error="Could not check the answers: offline"
        label="Part 1"
        onCheck={() => {}}
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not check the answers: offline')
    // The error is not inside the lg:hidden row, so it shows on every size.
    expect(alert.closest('.lg\\:hidden')).toBeNull()
  })
})

describe('EvidenceIconButton', () => {
  test('says why the evidence is missing next to its own question only', () => {
    const value = {
      answers: {},
      currentNumber: null,
      evidenceNote: {
        number: 3,
        text: 'Question 3: no evidence yet.',
        tone: 'info' as const,
      },
      onFocusQuestion: () => {},
      onShowEvidence: () => {},
      readOnly: false,
      review: null,
      setAnswer: () => {},
    }

    render(
      <IeltsAnswerContext.Provider value={value}>
        <p>
          Two <EvidenceIconButton number={2} />
        </p>
        <p>
          Three <EvidenceIconButton number={3} />
        </p>
      </IeltsAnswerContext.Provider>
    )

    expect(screen.getAllByText('Question 3: no evidence yet.')).toHaveLength(1)
    expect(
      screen.getByText('Question 3: no evidence yet.').closest('p')
    ).toHaveTextContent('Three')
  })
})
