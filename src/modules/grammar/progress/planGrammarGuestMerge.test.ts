import { describe, expect, it } from 'vitest'

import {
  daysFrom,
  NOW,
  passedLesson,
} from '@/modules/grammar/testing/fixtureCourse'

import { planGrammarGuestMerge } from './planGrammarGuestMerge'
import type { CardMiss } from './types'

const empty = { lessons: [], misses: [], units: [] }

describe('planGrammarGuestMerge', () => {
  it('moves guest rows the user does not have', () => {
    const guestLesson = passedLesson('u01-l01')

    expect(
      planGrammarGuestMerge({ ...empty, lessons: [guestLesson] }, empty).lessons
    ).toEqual([guestLesson])
  })

  it('keeps the best stars and accuracy and the earliest completion', () => {
    const guest = passedLesson('u01-l01', {
      bestAccuracy: 0.9,
      completedAt: daysFrom(NOW, -9),
      stars: 2,
    })
    const user = passedLesson('u01-l01', {
      bestAccuracy: 0.7,
      completedAt: daysFrom(NOW, -2),
      stars: 3,
    })
    const [merged] = planGrammarGuestMerge(
      { ...empty, lessons: [guest] },
      { ...empty, lessons: [user] }
    ).lessons

    expect(merged).toMatchObject({
      attempts: 2,
      bestAccuracy: 0.9,
      completedAt: daysFrom(NOW, -9),
      stars: 3,
    })
  })

  it('takes the ladder from whichever side has one, the user first', () => {
    const onLadder = passedLesson('u01-l01', {
      dueAt: daysFrom(NOW, 5),
      recallStage: 4,
    })
    const testOnly = passedLesson('u01-l01', {
      dueAt: null,
      passedBy: 'test',
      recallStage: null,
      stars: 0,
    })

    expect(
      planGrammarGuestMerge(
        { ...empty, lessons: [onLadder] },
        { ...empty, lessons: [testOnly] }
      ).lessons[0]
    ).toMatchObject({ passedBy: 'lesson', recallStage: 4 })
    expect(
      planGrammarGuestMerge(
        { ...empty, lessons: [{ ...onLadder, recallStage: 2 }] },
        { ...empty, lessons: [onLadder] }
      ).lessons[0]?.recallStage
    ).toBe(4)
  })

  it('prefers a checkpoint pass and the earliest unit completion', () => {
    const merged = planGrammarGuestMerge(
      {
        ...empty,
        units: [
          {
            completedAt: daysFrom(NOW, -5),
            passedBy: 'checkpoint',
            unitId: 'u01',
          },
        ],
      },
      {
        ...empty,
        units: [
          { completedAt: daysFrom(NOW, -1), passedBy: 'test', unitId: 'u01' },
        ],
      }
    ).units[0]

    expect(merged).toEqual({
      completedAt: daysFrom(NOW, -5),
      passedBy: 'checkpoint',
      unitId: 'u01',
    })
  })

  it('keeps a miss open if either side is open', () => {
    const miss = (overrides: Partial<CardMiss>): CardMiss => ({
      cardId: 'u01-l01-c02',
      clearedAt: null,
      lastMissedAt: daysFrom(NOW, -3),
      lessonId: 'u01-l01',
      missCount: 1,
      ...overrides,
    })
    const merged = planGrammarGuestMerge(
      { ...empty, misses: [miss({ lastMissedAt: NOW, missCount: 2 })] },
      {
        ...empty,
        misses: [miss({ clearedAt: daysFrom(NOW, -1), missCount: 4 })],
      }
    ).misses[0]

    expect(merged).toMatchObject({
      clearedAt: null,
      lastMissedAt: NOW,
      missCount: 4,
    })
  })
})
