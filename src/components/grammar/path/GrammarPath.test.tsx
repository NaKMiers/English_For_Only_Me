import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, test, vi } from 'vitest'

import { buildGrammarPath } from '@/modules/grammar/path/buildGrammarPath'
import {
  daysFrom,
  fixtureCourse,
  NOW,
  passedLesson,
} from '@/modules/grammar/testing/fixtureCourse'

import { expectLandingBudget } from '@/test/landingBudget'

import { GrammarPath } from './GrammarPath'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/components/common/OutboxOwnerProvider', () => ({
  useClientOutbox: () => ({
    pendingItems: () => [],
    subscribe: () => () => undefined,
  }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia ??= ((query: string) => ({
    addEventListener: () => undefined,
    matches: false,
    media: query,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
})

function path(lessonProgress = [passedLesson('u01-l01')]) {
  return buildGrammarPath({
    course: fixtureCourse,
    lessonProgress,
    misses: [],
    now: NOW,
    unitProgress: [],
  })
}

describe('GrammarPath', () => {
  test('meets the landing budget: one next stop, one cta, 4 chips', () => {
    const { container } = render(<GrammarPath path={path()} />)

    expectLandingBudget(container)
  })

  test('shows the next step and opens only the current unit', () => {
    render(<GrammarPath path={path()} />)

    expect(
      screen.getByRole('heading', { name: 'Continue: Lesson u01-l02' })
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: /Start lesson/ })).toHaveProperty(
      'href',
      expect.stringContaining('/grammar/lessons/u01-l02')
    )
    // Unit 1 is open, so its lessons are rendered; unit 2 is folded.
    expect(screen.getByRole('button', { name: /Lesson u01-l01, done/ }))
    expect(screen.queryByRole('button', { name: /Lesson u02-l01/ })).toBeNull()
  })

  test('climbs the level staircase from the first level', () => {
    render(<GrammarPath path={path()} />)

    expect(
      screen.getAllByRole('listitem', { name: /you are here/ })
    ).toHaveLength(1)
    expect(screen.getByText(/lessons? to finish/)).toBeTruthy()
  })

  test('links Review due to the first due lesson', () => {
    render(
      <GrammarPath
        path={path([
          passedLesson('u01-l01', { dueAt: daysFrom(NOW, -1) }),
          passedLesson('u01-l02'),
        ])}
      />
    )

    expect(screen.getByRole('link', { name: /Review due/ })).toHaveProperty(
      'href',
      expect.stringContaining('/grammar/lessons/u01-l01/review')
    )
  })

  test('unfolds the new current unit when a refresh moves the learner on', () => {
    const before = path()
    const { rerender } = render(<GrammarPath path={before} />)

    expect(screen.queryByRole('button', { name: /Lesson u02-l01/ })).toBeNull()

    rerender(<GrammarPath path={{ ...before, currentUnitId: 'u02' }} />)

    expect(
      screen.getByRole('button', { name: /Lesson u02-l01, locked/ })
    ).toBeTruthy()
    // What was open stays open.
    expect(
      screen.getByRole('button', { name: /Lesson u01-l01, done/ })
    ).toBeTruthy()
  })
})
