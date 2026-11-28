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
  test('keeps the card short: no next stop, chips beside the headline', () => {
    const { container } = render(<GrammarPath path={path()} />)
    const header = container.querySelector('[data-journey-slot="headline"]')
      ?.parentElement?.parentElement

    expect(container.querySelector('[data-journey-slot="next"]')).toBeNull()
    expect(
      header?.querySelector('[data-journey-slot="stats"] [data-stat-strip]')
    ).not.toBeNull()
    expectLandingBudget(container, { ctas: 0, nextStops: 0 })
  })

  test('leaves the next step to the path and opens only the current unit', () => {
    render(<GrammarPath path={path()} />)

    expect(screen.queryByRole('link', { name: /Start lesson/ })).toBeNull()
    // Unit 1 is open, so its lessons are rendered; unit 2 is folded.
    expect(screen.getByRole('button', { name: /Lesson u01-l01, done/ }))
    expect(screen.queryByRole('button', { name: /Lesson u02-l01/ })).toBeNull()
  })

  test('climbs the level staircase from the first level', () => {
    render(<GrammarPath path={path()} />)

    expect(
      screen.getAllByRole('listitem', { name: /you are here/ })
    ).toHaveLength(1)
    // The step being climbed carries the lessons still to go.
    const current = screen.getByRole('listitem', { name: /you are here/ })

    expect(current.getAttribute('title')).toMatch(/lessons? to finish/)
    expect(current.textContent).toMatch(/\d+ to go/)
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
