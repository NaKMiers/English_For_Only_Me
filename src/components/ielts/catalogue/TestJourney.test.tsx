import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import { expectLandingBudget } from '@/test/landingBudget'

import { bandsFromAttempts, TestJourney } from './TestJourney'

const entry = {
  id: 't1',
  skills: [
    { skill: 'listening' as const },
    { skill: 'reading' as const },
    { skill: 'writing' as const },
  ],
}

const attempt = (
  skill: IeltsAttemptSummary['skill'],
  band: number | null,
  status: IeltsAttemptSummary['status'] = 'submitted'
) => ({ band, skill, status }) as IeltsAttemptSummary

describe('TestJourney', () => {
  test('bands per skill come from finished attempts only', () => {
    expect(
      bandsFromAttempts('t1', [
        attempt('reading', 6),
        attempt('reading', 7),
        attempt('listening', 8, 'in_progress'),
      ])
    ).toEqual({ t1: { reading: 7 } })
  })

  test('counts banded skills and sends the next stop into the next skill', () => {
    const { container } = render(
      <TestJourney
        attempts={[attempt('listening', 6.5), attempt('reading', 7)]}
        entry={entry}
        messages={en}
        slug="cam-18-1"
        targetBand={7}
      />
    )

    expectLandingBudget(container)
    expect(screen.getByText('Writing clears this test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start Writing' })).toHaveAttribute(
      'href',
      '/ielts/cam-18-1/writing'
    )
  })

  test('every skill banded: the cleared state, no button', () => {
    render(
      <TestJourney
        attempts={[
          attempt('listening', 6),
          attempt('reading', 6),
          attempt('writing', 6),
        ]}
        entry={entry}
        messages={en}
        slug="cam-18-1"
        targetBand={7}
      />
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getAllByText(/Test cleared/).length).toBeGreaterThan(0)
  })
})
