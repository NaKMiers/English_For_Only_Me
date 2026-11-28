import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'

import { IeltsResultHead } from './IeltsResultHead'

const summary = (
  id: string,
  skill: IeltsAttemptSummary['skill'],
  band: number | null
) => ({ band, id, skill, status: 'scored' }) as IeltsAttemptSummary

const test3 = {
  id: 't3',
  skills: ['listening', 'reading', 'writing'] as const,
  targetBand: 7,
}

describe('IeltsResultHead', () => {
  test('band first, the delta since last time, then the next skill', () => {
    const { container } = render(
      <IeltsResultHead
        attempt={{
          band: 7,
          id: 'a2',
          result: { band: 7, raw: 30, total: 40 },
          skill: 'reading',
          testSlug: 'cam-15-3',
        }}
        history={[summary('a2', 'reading', 7), summary('a1', 'reading', 6.5)]}
        messages={en}
        test={{ ...test3, skills: [...test3.skills] }}
      />
    )

    // The band headline and the target chip both read 7.0.
    expect(screen.getAllByText('7.0')).toHaveLength(2)
    expect(screen.getByText('+0.5')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-next-stop]')).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: 'Start Listening' })
    ).toHaveAttribute('href', '/ielts/cam-15-3/listening')
  })

  test('the first band for a skill is a step; a cleared test goes back to the list', () => {
    render(
      <IeltsResultHead
        attempt={{
          // Writing keeps its band in writingBand: no objective result.
          band: 6,
          id: 'w1',
          result: null,
          skill: 'writing',
          testSlug: 'cam-15-3',
        }}
        history={[
          summary('w1', 'writing', 6),
          summary('l1', 'listening', 6),
          summary('r1', 'reading', 6),
        ]}
        messages={en}
        test={{ ...test3, skills: [...test3.skills] }}
      />
    )

    expect(screen.getByText('6.0')).toBeInTheDocument()
    expect(screen.queryByText('0/0')).not.toBeInTheDocument()
    expect(
      screen.getByText('+1 step: 3 of 3 skills banded in this test')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All tests' })).toHaveAttribute(
      'href',
      '/ielts'
    )
  })
})
