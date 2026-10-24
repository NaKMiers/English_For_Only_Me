import { describe, expect, it } from 'vitest'

import type { UnitProgress } from '@/modules/grammar/progress/types'
import {
  daysFrom,
  fixtureCourse,
  NOW,
  passedLesson,
} from '@/modules/grammar/testing/fixtureCourse'

import { buildGrammarPath, isLessonUnlocked } from './buildGrammarPath'

const unitDone = (unitId: string): UnitProgress => ({
  completedAt: daysFrom(NOW, -1),
  passedBy: 'checkpoint',
  unitId,
})

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

function states(view: ReturnType<typeof build>, unitIndex: number) {
  return view.units[unitIndex]?.lessons.map(lesson => lesson.state)
}

describe('buildGrammarPath', () => {
  it('opens only the first lesson for a brand-new learner', () => {
    const view = build()

    expect(states(view, 0)).toEqual([
      'open',
      'locked',
      'locked',
      'locked',
      'locked',
    ])
    expect(view.units.map(unit => unit.state)).toEqual([
      'active',
      'locked',
      'locked',
    ])
    expect(view.next).toEqual({
      kind: 'lesson',
      lessonId: 'u01-l01',
      title: 'Lesson u01-l01',
    })
    expect(view.currentUnitId).toBe('u01')
    expect(view.totals).toEqual({
      dueCount: 0,
      maxStars: 45,
      passedLessons: 0,
      stars: 0,
      totalLessons: 15,
      weakCount: 0,
    })
  })

  it('unlocks lessons one at a time as each is passed', () => {
    const view = build({
      lessonProgress: [
        passedLesson('u01-l01'),
        passedLesson('u01-l02', { stars: 1 }),
      ],
    })

    expect(states(view, 0)).toEqual([
      'passed',
      'passed',
      'open',
      'locked',
      'locked',
    ])
    expect(view.totals.stars).toBe(4)
  })

  it('opens the checkpoint, not the next unit, when all five lessons pass', () => {
    const lessonProgress = [1, 2, 3, 4, 5].map(n => passedLesson(`u01-l0${n}`))
    const view = build({ lessonProgress })

    expect(view.units[0]?.checkpoint).toBe('open')
    expect(view.units[1]?.state).toBe('locked')
    expect(view.next).toEqual({
      kind: 'checkpoint',
      title: 'Unit 1',
      unitId: 'u01',
    })
  })

  it('opens the next unit once the checkpoint passes', () => {
    const lessonProgress = [1, 2, 3, 4, 5].map(n => passedLesson(`u01-l0${n}`))
    const view = build({ lessonProgress, unitProgress: [unitDone('u01')] })

    expect(view.units[0]).toMatchObject({
      checkpoint: 'passed',
      state: 'complete',
    })
    expect(view.units[1]?.state).toBe('active')
    expect(states(view, 1)?.[0]).toBe('open')
    expect(view.next).toMatchObject({ kind: 'lesson', lessonId: 'u02-l01' })
  })

  it('treats a test pass as passed with zero stars and no ladder', () => {
    const view = build({
      lessonProgress: [
        passedLesson('u01-l01', {
          dueAt: null,
          passedBy: 'test',
          recallStage: null,
          stars: 0,
        }),
      ],
    })

    expect(view.units[0]?.lessons[0]).toMatchObject({
      passedByTest: true,
      stars: 0,
      state: 'passed',
    })
    expect(states(view, 0)?.[1]).toBe('open')
  })

  it('marks due lessons and points the CTA at the most overdue one when nothing is open', () => {
    const lessonProgress = [1, 2, 3, 4, 5].map(n =>
      passedLesson(`u01-l0${n}`, {
        dueAt:
          n === 2
            ? daysFrom(NOW, -5)
            : n === 4
              ? daysFrom(NOW, -1)
              : daysFrom(NOW, 3),
      })
    )
    const others = fixtureCourse.units
      .slice(1)
      .flatMap(unit => unit.lessons.map(lesson => passedLesson(lesson.id)))
    const view = build({
      lessonProgress: [...lessonProgress, ...others],
      unitProgress: [unitDone('u01'), unitDone('u02'), unitDone('u03')],
    })

    expect(states(view, 0)).toEqual([
      'passed',
      'due',
      'passed',
      'due',
      'passed',
    ])
    expect(view.totals.dueCount).toBe(2)
    expect(view.next).toEqual({
      kind: 'review',
      lessonId: 'u01-l02',
      title: 'Lesson u01-l02',
    })
  })

  it('never marks a mastered lesson as due', () => {
    const view = build({
      lessonProgress: [
        passedLesson('u01-l01', {
          dueAt: null,
          masteredAt: daysFrom(NOW, -1),
          recallStage: 7,
        }),
      ],
    })

    expect(states(view, 0)?.[0]).toBe('mastered')
  })

  it('falls back to weak spots, then done', () => {
    const allUnits = ['u01', 'u02', 'u03'].map(unitDone)
    const allLessons = fixtureCourse.units.flatMap(unit =>
      unit.lessons.map(lesson => passedLesson(lesson.id))
    )
    const miss = {
      cardId: 'u01-l01-c02',
      clearedAt: null,
      lastMissedAt: NOW,
      lessonId: 'u01-l01',
      missCount: 1,
    }

    expect(
      build({
        lessonProgress: allLessons,
        misses: [miss],
        unitProgress: allUnits,
      }).next
    ).toEqual({ count: 1, kind: 'weak' })
    expect(
      build({
        lessonProgress: allLessons,
        misses: [{ ...miss, clearedAt: NOW }],
        unitProgress: allUnits,
      }).next
    ).toEqual({ kind: 'done' })
  })

  it('ignores rows for content that no longer exists and resolves aliases', () => {
    const view = build({
      lessonProgress: [passedLesson('old-u01-l01'), passedLesson('u99-l01')],
      misses: [
        {
          cardId: 'u99-l01-c02',
          clearedAt: null,
          lastMissedAt: NOW,
          lessonId: 'u99-l01',
          missCount: 2,
        },
        {
          cardId: 'u01-l01-c01',
          clearedAt: null,
          lastMissedAt: NOW,
          lessonId: 'u01-l01',
          missCount: 1,
        },
      ],
      unitProgress: [unitDone('u99')],
    })

    expect(states(view, 0)?.[0]).toBe('passed')
    expect(view.totals.passedLessons).toBe(1)
    // u99 does not exist and u01-l01-c01 is an explain card: neither counts.
    expect(view.totals.weakCount).toBe(0)
    expect(view.units[1]?.state).toBe('locked')
  })
})

describe('isLessonUnlocked', () => {
  it('follows the same rules as the path', () => {
    const input = {
      course: fixtureCourse,
      lessonProgress: [passedLesson('u01-l01')],
      unitProgress: [],
    }

    expect(isLessonUnlocked(input, 'u01-l01')).toBe(true)
    expect(isLessonUnlocked(input, 'u01-l02')).toBe(true)
    expect(isLessonUnlocked(input, 'u01-l03')).toBe(false)
    expect(isLessonUnlocked(input, 'u02-l01')).toBe(false)
    expect(isLessonUnlocked(input, 'nope')).toBe(false)
    expect(
      isLessonUnlocked({ ...input, unitProgress: [unitDone('u01')] }, 'u02-l01')
    ).toBe(true)
  })
})
