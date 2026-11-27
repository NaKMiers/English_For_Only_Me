import { describe, expect, it } from 'vitest'

import {
  daysFrom,
  fixtureCourse,
  NOW,
  passedLesson,
} from '@/modules/grammar/testing/fixtureCourse'

import { buildGrammarPath } from './buildGrammarPath'
import {
  firstDueLesson,
  initialOpenUnitIds,
  pathLevels,
  summarizeUnit,
  unitOfNext,
} from './unitSummary'

function build(input: Partial<Parameters<typeof buildGrammarPath>[0]> = {}) {
  return buildGrammarPath({
    course: fixtureCourse,
    lessonProgress: [],
    misses: [],
    now: NOW,
    unitProgress: [],
    ...input,
  })
}

describe('summarizeUnit', () => {
  it('counts nothing done for a brand-new learner', () => {
    const [first] = build().units

    expect(first && summarizeUnit(first)).toMatchObject({
      done: 0,
      dueCount: 0,
      maxStars: 15,
      percent: 0,
      stars: 0,
      total: 5,
    })
  })

  it('counts passed, due and mastered lessons as done and sums stars', () => {
    const view = build({
      lessonProgress: [
        passedLesson('u01-l01'),
        passedLesson('u01-l02', { dueAt: daysFrom(NOW, -1), stars: 2 }),
        passedLesson('u01-l03', { masteredAt: daysFrom(NOW, -1), stars: 1 }),
      ],
    })
    const summary = view.units[0] && summarizeUnit(view.units[0])

    expect(summary).toMatchObject({
      done: 3,
      dueCount: 1,
      percent: 60,
      stars: 6,
      total: 5,
    })
  })
})

describe('initialOpenUnitIds', () => {
  it('opens the current unit', () => {
    const view = build()

    expect(initialOpenUnitIds(view)).toEqual(['u01'])
    expect(initialOpenUnitIds({ ...view, currentUnitId: 'u02' })).toEqual([
      'u02',
    ])
  })

  it('falls back to the first unit, and to nothing for an empty path', () => {
    const view = build()

    expect(initialOpenUnitIds({ ...view, currentUnitId: null })).toEqual([
      'u01',
    ])
    expect(initialOpenUnitIds({ ...view, units: [] })).toEqual([])
  })
})

describe('firstDueLesson', () => {
  it('returns the first due lesson in path order, or null', () => {
    expect(firstDueLesson(build().units)).toBeNull()

    const view = build({
      lessonProgress: [
        passedLesson('u01-l01'),
        passedLesson('u01-l02', { dueAt: daysFrom(NOW, -2) }),
        passedLesson('u01-l03', { dueAt: daysFrom(NOW, -1) }),
      ],
    })

    expect(firstDueLesson(view.units)?.id).toBe('u01-l02')
  })
})

describe('pathLevels', () => {
  it('lists each level once, in path order', () => {
    const units = build().units

    expect(pathLevels(units)).toEqual([...new Set(units.map(u => u.level))])
    expect(pathLevels([])).toEqual([])
  })
})

describe('unitOfNext', () => {
  it('finds the unit of the next lesson, checkpoint or current unit', () => {
    const view = build()

    expect(unitOfNext(view)?.id).toBe('u01')
    expect(
      unitOfNext(view, { kind: 'checkpoint', title: 'x', unitId: 'u02' })?.id
    ).toBe('u02')
    expect(
      unitOfNext(view, { kind: 'review', lessonId: 'u03-l01', title: 'x' })?.id
    ).toBe('u03')
    expect(unitOfNext(view, { kind: 'done' })?.id).toBe('u01')
    expect(
      unitOfNext({ ...view, currentUnitId: null }, { count: 2, kind: 'weak' })
    ).toBeNull()
  })
})
