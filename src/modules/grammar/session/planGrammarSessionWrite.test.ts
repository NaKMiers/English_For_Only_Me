import { describe, expect, it } from 'vitest'

import type {
  CardMiss,
  LessonProgress,
  UnitProgress,
} from '@/modules/grammar/progress/types'
import { createRng } from '@/modules/grammar/rng'
import {
  daysFrom,
  fixtureCourse,
  lessonAnswers,
  NOW,
  passedLesson,
} from '@/modules/grammar/testing/fixtureCourse'

import { buildCheckpointSet } from './buildPracticeSet'
import {
  planGrammarSessionWrite,
  type GrammarSessionSubmission,
} from './planGrammarSessionWrite'
import { starsForAccuracy } from './scoring'

interface Progress {
  lessonProgress?: LessonProgress[]
  unitProgress?: UnitProgress[]
  misses?: CardMiss[]
}

function plan(submission: GrammarSessionSubmission, progress: Progress = {}) {
  return planGrammarSessionWrite({
    course: fixtureCourse,
    now: NOW,
    progress: {
      lessonProgress: progress.lessonProgress ?? [],
      misses: progress.misses ?? [],
      unitProgress: progress.unitProgress ?? [],
    },
    submission,
  })
}

function okPlan(result: ReturnType<typeof plan>) {
  if (!result.ok)
    throw new Error(`Expected ok, got ${result.status}: ${result.message}`)

  return result.plan
}

const unitDone = (unitId: string): UnitProgress => ({
  completedAt: daysFrom(NOW, -1),
  passedBy: 'checkpoint',
  unitId,
})

function checkpointAnswers(unitId: string, wrongCount = 0) {
  const unit = fixtureCourse.getUnit(unitId)

  if (!unit) throw new Error(unitId)

  return buildCheckpointSet(fixtureCourse, unit, createRng(1)).map(
    (card, index) => ({ answer: index < wrongCount ? 1 : 0, cardId: card.id })
  )
}

describe('starsForAccuracy', () => {
  it.each([
    [1, 3],
    [0.95, 3],
    [0.949, 2],
    [0.8, 2],
    [0.799, 1],
    [0, 1],
  ])('accuracy %f earns %i stars', (accuracy, stars) => {
    expect(starsForAccuracy(accuracy)).toBe(stars)
  })
})

describe('planGrammarSessionWrite: lesson', () => {
  it('awards stars, enters the ladder due tomorrow, and unlocks the next lesson', () => {
    const result = okPlan(
      plan({
        answers: lessonAnswers('u01-l01'),
        mode: 'lesson',
        targetId: 'u01-l01',
      })
    )

    expect(result.lessonWrites).toHaveLength(1)
    expect(result.lessonWrites[0]).toMatchObject({
      attempts: 1,
      bestAccuracy: 1,
      completedAt: NOW,
      lessonId: 'u01-l01',
      passedBy: 'lesson',
      recallStage: 2,
      stars: 3,
    })
    expect(result.lessonWrites[0]?.dueAt).toEqual(daysFrom(NOW, 1))
    expect(result.response).toMatchObject({
      accuracy: 1,
      correctCount: 8,
      passed: true,
      stars: 3,
      total: 8,
      unlocked: { kind: 'lesson', lessonId: 'u01-l02' },
    })
    expect(result.missWrites).toEqual([])
  })

  it('records a miss for each wrong first answer and scores stars from accuracy', () => {
    const result = okPlan(
      plan({
        answers: lessonAnswers('u01-l01', ['u01-l01-c02', 'u01-l01-c03']),
        mode: 'lesson',
        targetId: 'u01-l01',
      })
    )

    expect(result.response.stars).toBe(1)
    expect(result.response.results.filter(item => !item.correct)).toHaveLength(
      2
    )
    expect(result.missWrites).toEqual([
      {
        cardId: 'u01-l01-c02',
        clearedAt: null,
        lastMissedAt: NOW,
        lessonId: 'u01-l01',
        missCount: 1,
      },
      {
        cardId: 'u01-l01-c03',
        clearedAt: null,
        lastMissedAt: NOW,
        lessonId: 'u01-l01',
        missCount: 1,
      },
    ])
  })

  it('bumps an existing miss and reopens a cleared one', () => {
    const result = okPlan(
      plan(
        {
          answers: lessonAnswers('u01-l01', ['u01-l01-c02']),
          mode: 'lesson',
          targetId: 'u01-l01',
        },
        {
          misses: [
            {
              cardId: 'u01-l01-c02',
              clearedAt: daysFrom(NOW, -1),
              lastMissedAt: daysFrom(NOW, -2),
              lessonId: 'u01-l01',
              missCount: 2,
            },
          ],
        }
      )
    )

    expect(result.missWrites[0]).toMatchObject({
      clearedAt: null,
      missCount: 3,
    })
  })

  it('on a replay keeps the best stars and leaves the ladder alone', () => {
    const before = passedLesson('u01-l01', {
      attempts: 2,
      dueAt: daysFrom(NOW, 4),
      recallStage: 3,
      stars: 3,
    })
    const result = okPlan(
      plan(
        {
          answers: lessonAnswers('u01-l01', ['u01-l01-c02', 'u01-l01-c03']),
          mode: 'lesson',
          targetId: 'u01-l01',
        },
        { lessonProgress: [before] }
      )
    )

    expect(result.lessonWrites[0]).toMatchObject({
      attempts: 3,
      dueAt: daysFrom(NOW, 4),
      recallStage: 3,
      stars: 3,
    })
    expect(result.response.stars).toBe(1)
    expect(result.response.unlocked).toBeNull()
  })

  it('upgrades a test pass to a lesson pass and starts the ladder', () => {
    const before = passedLesson('u01-l01', {
      dueAt: null,
      passedBy: 'test',
      recallStage: null,
      stars: 0,
    })
    const result = okPlan(
      plan(
        {
          answers: lessonAnswers('u01-l01'),
          mode: 'lesson',
          targetId: 'u01-l01',
        },
        { lessonProgress: [before] }
      )
    )

    expect(result.lessonWrites[0]).toMatchObject({
      passedBy: 'lesson',
      recallStage: 2,
      stars: 3,
    })
    expect(result.response.unlocked).toBeNull()
  })

  it('unlocks the checkpoint after the last lesson of a unit', () => {
    const lessonProgress = [1, 2, 3, 4].map(n => passedLesson(`u01-l0${n}`))
    const result = okPlan(
      plan(
        {
          answers: lessonAnswers('u01-l05'),
          mode: 'lesson',
          targetId: 'u01-l05',
        },
        { lessonProgress }
      )
    )

    expect(result.response.unlocked).toEqual({
      kind: 'checkpoint',
      title: 'Unit 1',
      unitId: 'u01',
    })
  })

  it('rejects a locked lesson with 409', () => {
    expect(
      plan({
        answers: lessonAnswers('u01-l03'),
        mode: 'lesson',
        targetId: 'u01-l03',
      })
    ).toMatchObject({ ok: false, status: 409 })
  })

  it.each([
    ['a missing card', lessonAnswers('u01-l01').slice(1)],
    [
      'a duplicated card',
      [...lessonAnswers('u01-l01').slice(1), lessonAnswers('u01-l01')[1]!],
    ],
    [
      'a card from another lesson',
      [...lessonAnswers('u01-l01').slice(1), lessonAnswers('u01-l02')[0]!],
    ],
    [
      'an explain card',
      [
        ...lessonAnswers('u01-l01').slice(1),
        { answer: 0, cardId: 'u01-l01-c01' },
      ],
    ],
    [
      'an unknown card',
      [...lessonAnswers('u01-l01').slice(1), { answer: 0, cardId: 'zzz' }],
    ],
    [
      'a malformed answer',
      [
        ...lessonAnswers('u01-l01').slice(1),
        { answer: 'x', cardId: 'u01-l01-c02' },
      ],
    ],
    ['no answers', []],
  ])('rejects %s with 400', (_, answers) => {
    expect(
      plan({ answers, mode: 'lesson', targetId: 'u01-l01' })
    ).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  it('rejects an unknown lesson with 400', () => {
    expect(
      plan({
        answers: lessonAnswers('u01-l01'),
        mode: 'lesson',
        targetId: 'u77-l01',
      })
    ).toMatchObject({ ok: false, status: 400 })
  })
})

describe('planGrammarSessionWrite: review', () => {
  const due = passedLesson('u01-l01', {
    dueAt: daysFrom(NOW, -1),
    recallStage: 3,
  })
  const reviewAnswers = (wrong = 0) =>
    lessonAnswers('u01-l01')
      .slice(0, 6)
      .map((item, index) => ({ ...item, answer: index < wrong ? 1 : 0 }))

  it('advances the ladder on a pass', () => {
    const result = okPlan(
      plan(
        { answers: reviewAnswers(1), mode: 'review', targetId: 'u01-l01' },
        { lessonProgress: [due] }
      )
    )

    expect(result.response.passed).toBe(true)
    expect(result.lessonWrites[0]).toMatchObject({
      recallStage: 4,
      reviewCount: 1,
    })
    expect(result.lessonWrites[0]?.stars).toBe(3)
  })

  it('drops to stage 1, due now, on a fail', () => {
    const result = okPlan(
      plan(
        { answers: reviewAnswers(2), mode: 'review', targetId: 'u01-l01' },
        { lessonProgress: [due] }
      )
    )

    expect(result.response.passed).toBe(false)
    expect(result.lessonWrites[0]).toMatchObject({ dueAt: NOW, recallStage: 1 })
    expect(result.missWrites).toHaveLength(2)
  })

  it('rejects a lesson that is not due, not on the ladder, or mastered', () => {
    for (const row of [
      passedLesson('u01-l01', { dueAt: daysFrom(NOW, 1) }),
      passedLesson('u01-l01', {
        dueAt: null,
        passedBy: 'test',
        recallStage: null,
        stars: 0,
      }),
      passedLesson('u01-l01', { dueAt: null, masteredAt: NOW, recallStage: 7 }),
    ])
      expect(
        plan(
          { answers: reviewAnswers(), mode: 'review', targetId: 'u01-l01' },
          { lessonProgress: [row] }
        )
      ).toMatchObject({ ok: false, status: 409 })

    expect(
      plan({ answers: reviewAnswers(), mode: 'review', targetId: 'u01-l01' })
    ).toMatchObject({
      ok: false,
      status: 409,
    })
  })

  it('rejects too few or foreign cards with 400', () => {
    const progress = { lessonProgress: [due] }

    expect(
      plan(
        {
          answers: reviewAnswers().slice(0, 5),
          mode: 'review',
          targetId: 'u01-l01',
        },
        progress
      )
    ).toMatchObject({ status: 400 })
    expect(
      plan(
        {
          answers: [...reviewAnswers().slice(1), lessonAnswers('u01-l02')[0]!],
          mode: 'review',
          targetId: 'u01-l01',
        },
        progress
      )
    ).toMatchObject({ status: 400 })
  })
})

describe('planGrammarSessionWrite: checkpoint', () => {
  const allPassedU1 = [1, 2, 3, 4, 5].map(n => passedLesson(`u01-l0${n}`))

  it('completes the unit and unlocks the next on a regular pass', () => {
    const result = okPlan(
      plan(
        {
          answers: checkpointAnswers('u01', 2),
          mode: 'checkpoint',
          targetId: 'u01',
        },
        { lessonProgress: allPassedU1 }
      )
    )

    expect(result.response).toMatchObject({
      passed: true,
      testOut: false,
      unlocked: { kind: 'unit', unitId: 'u02' },
    })
    expect(result.unitWrites).toEqual([
      { completedAt: NOW, passedBy: 'checkpoint', unitId: 'u01' },
    ])
    expect(result.lessonWrites).toEqual([])
    expect(result.missWrites).toHaveLength(2)
  })

  it('writes nothing but misses on a regular fail', () => {
    const result = okPlan(
      plan(
        {
          answers: checkpointAnswers('u01', 3),
          mode: 'checkpoint',
          targetId: 'u01',
        },
        { lessonProgress: allPassedU1 }
      )
    )

    expect(result.response.passed).toBe(false)
    expect(result.unitWrites).toEqual([])
    expect(result.missWrites).toHaveLength(3)
  })

  it('a test-out passes every earlier unit and lesson, without stars, ladder, or misses', () => {
    const result = okPlan(
      plan(
        {
          answers: checkpointAnswers('u02', 1),
          mode: 'checkpoint',
          targetId: 'u02',
        },
        { lessonProgress: [passedLesson('u01-l01', { stars: 2 })] }
      )
    )

    expect(result.response).toMatchObject({
      passed: true,
      testOut: true,
      unlocked: { unitId: 'u03' },
    })
    expect(result.unitWrites.map(row => [row.unitId, row.passedBy])).toEqual([
      ['u01', 'test'],
      ['u02', 'test'],
    ])
    // u01-l01 already passed with stars: untouched. The other 9 become test passes.
    expect(result.lessonWrites).toHaveLength(9)
    expect(
      result.lessonWrites.every(
        row =>
          row.passedBy === 'test' && row.stars === 0 && row.recallStage === null
      )
    ).toBe(true)
    expect(result.missWrites).toEqual([])
  })

  it('a failed test-out changes nothing', () => {
    const result = okPlan(
      plan({
        answers: checkpointAnswers('u03', 5),
        mode: 'checkpoint',
        targetId: 'u03',
      })
    )

    expect(result.response).toMatchObject({
      passed: false,
      testOut: true,
      unlocked: null,
    })
    expect(result).toMatchObject({
      lessonWrites: [],
      missWrites: [],
      unitWrites: [],
    })
  })

  it('reports no next unit after the last one', () => {
    const result = okPlan(
      plan({
        answers: checkpointAnswers('u03'),
        mode: 'checkpoint',
        targetId: 'u03',
      })
    )

    expect(result.response.unlocked).toBeNull()
  })

  it('rejects a completed unit with 409 and a wrong card count with 400', () => {
    expect(
      plan(
        {
          answers: checkpointAnswers('u01'),
          mode: 'checkpoint',
          targetId: 'u01',
        },
        { unitProgress: [unitDone('u01')] }
      )
    ).toMatchObject({ status: 409 })
    expect(
      plan({
        answers: checkpointAnswers('u01').slice(1),
        mode: 'checkpoint',
        targetId: 'u01',
      })
    ).toMatchObject({ status: 400 })
    expect(
      plan({
        answers: [
          ...checkpointAnswers('u01').slice(1),
          lessonAnswers('u02-l01')[0]!,
        ],
        mode: 'checkpoint',
        targetId: 'u01',
      })
    ).toMatchObject({ status: 400 })
  })
})

describe('planGrammarSessionWrite: weak', () => {
  const open = (cardId: string, missCount = 1): CardMiss => ({
    cardId,
    clearedAt: null,
    lastMissedAt: daysFrom(NOW, -1),
    lessonId: 'u01-l01',
    missCount,
  })

  it('clears correct open misses and bumps wrong ones', () => {
    const result = okPlan(
      plan(
        {
          answers: [
            { answer: 0, cardId: 'u01-l01-c02' },
            { answer: 1, cardId: 'u01-l01-c03' },
          ],
          mode: 'weak',
          targetId: 'weak',
        },
        { misses: [open('u01-l01-c02'), open('u01-l01-c03', 2)] }
      )
    )

    expect(result.missWrites).toEqual([
      { ...open('u01-l01-c02'), clearedAt: NOW },
      {
        cardId: 'u01-l01-c03',
        clearedAt: null,
        lastMissedAt: NOW,
        lessonId: 'u01-l01',
        missCount: 3,
      },
    ])
    expect(result.lessonWrites).toEqual([])
  })

  it('rejects more than 12 cards', () => {
    const answers = [...lessonAnswers('u01-l01'), ...lessonAnswers('u01-l02')]

    expect(plan({ answers, mode: 'weak', targetId: 'weak' })).toMatchObject({
      status: 400,
    })
  })

  it('rejects cards that are not open misses', () => {
    const answers = [{ answer: 1, cardId: 'u02-l03-c02' }]

    expect(plan({ answers, mode: 'weak', targetId: 'weak' })).toMatchObject({
      status: 400,
    })
    expect(
      plan(
        { answers, mode: 'weak', targetId: 'weak' },
        { misses: [{ ...open('u02-l03-c02'), clearedAt: NOW }] }
      )
    ).toMatchObject({ status: 400 })
  })
})

describe('planGrammarSessionWrite: renamed ids', () => {
  it('updates rows stored under an alias instead of creating new ones', () => {
    const result = okPlan(
      plan(
        {
          answers: lessonAnswers('u01-l01', ['u01-l01-c02']),
          mode: 'lesson',
          targetId: 'u01-l01',
        },
        { lessonProgress: [passedLesson('old-u01-l01', { stars: 1 })] }
      )
    )

    expect(result.lessonWrites[0]?.lessonId).toBe('old-u01-l01')
  })
})
