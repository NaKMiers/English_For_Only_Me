import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { ProgressTabs } from './ProgressTabs'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('./DeleteAttemptButton', () => ({ DeleteAttemptButton: () => null }))

const attempt = {
  band: 6.5,
  deadlineAt: null,
  id: 'a1',
  mode: 'practice' as const,
  part: null,
  raw: 30,
  skill: 'reading' as const,
  startedAt: '2026-11-26T10:00:00Z',
  status: 'scored' as const,
  testSlug: 'ielts-15-test-3',
  testTitle: 'IELTS 15 Test 3',
  testVersion: 1,
  total: 40,
}

const weakness = {
  rows: [],
  totalQuestions: 40,
  weakest: [
    {
      accuracy: 0.4,
      correct: 4,
      skill: 'reading' as const,
      total: 10,
      type: 'matching-headings' as const,
    },
  ],
}

describe('ProgressTabs', () => {
  test('opens on recent attempts and switches to weak spots', () => {
    render(
      <ProgressTabs
        attempts={[attempt]}
        weakness={weakness}
      />
    )

    const [first] = screen.getAllByRole('tab')

    expect(first).toHaveAccessibleName(/Recent/)
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('link', { name: /IELTS 15 Test 3/ })
    ).toHaveAttribute('href', '/ielts/attempts/a1')
    expect(screen.getByText('6.5')).toBeTruthy()
    // Only the link pops; the row around it stays still.
    const link = screen.getByRole('link', { name: /IELTS 15 Test 3/ })
    expect(link.className).toMatch(/hover-pop/)
    expect(link.closest('li')?.className ?? '').not.toMatch(/hover:/)

    fireEvent.click(screen.getByRole('tab', { name: /Weak spots/ }))

    expect(screen.getByText('40%')).toBeTruthy()
    expect(screen.getByText('40%').closest('li')?.className ?? '').not.toMatch(
      /hover:/
    )
  })

  test('says so when nothing is finished yet', () => {
    render(
      <ProgressTabs
        attempts={[]}
        weakness={null}
      />
    )

    expect(screen.getByText('No finished attempts yet.')).toBeTruthy()
  })
})
