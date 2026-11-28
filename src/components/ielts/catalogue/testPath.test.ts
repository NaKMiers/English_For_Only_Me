import { describe, expect, test } from 'vitest'

import {
  groupProgress,
  journeyTotals,
  journeySegments,
  nextSkillOf,
  pickNextTest,
  stepsThisWeek,
  testNodeState,
} from './testPath'

const entry = (id: string) => ({
  id,
  skills: [{ skill: 'listening' as const }, { skill: 'reading' as const }],
})

describe('testNodeState', () => {
  test('reads new, partial and done from the bands', () => {
    expect(testNodeState(entry('a'), {})).toBe('new')
    expect(testNodeState(entry('a'), { a: { listening: 6 } })).toBe('partial')
    expect(testNodeState(entry('a'), { a: { listening: 6, reading: 7 } })).toBe(
      'done'
    )
  })
})

describe('pickNextTest', () => {
  const groups = [
    {
      heading: 'Book 1',
      tests: [{ entry: entry('a') }, { entry: entry('b') }],
    },
    { heading: 'Book 2', tests: [{ entry: entry('c') }] },
  ]

  test('finishes a started test before opening a new one', () => {
    const next = pickNextTest(groups, {
      a: { listening: 6, reading: 6 },
      c: { reading: 5 },
    })

    expect(next?.entry.id).toBe('c')
    expect(next?.heading).toBe('Book 2')
  })

  test('otherwise takes the first untouched test', () => {
    expect(
      pickNextTest(groups, { a: { listening: 6, reading: 6 } })?.entry.id
    ).toBe('b')
  })

  test('is null once everything is done', () => {
    const done = { listening: 6, reading: 6 }

    expect(pickNextTest(groups, { a: done, b: done, c: done })).toBeNull()
  })
})

describe('groupProgress', () => {
  test('counts done tests only', () => {
    expect(
      groupProgress(
        {
          heading: 'Book',
          tests: [{ entry: entry('a') }, { entry: entry('b') }],
        },
        { a: { listening: 6, reading: 6 }, b: { listening: 6 } }
      )
    ).toEqual({ done: 1, total: 2 })
  })
})

describe('journeyTotals', () => {
  test('counts every banded skill as a step and clears full books', () => {
    const groups = [
      { heading: 'Book 1', tests: [{ entry: entry('a') }] },
      {
        heading: 'Book 2',
        tests: [{ entry: entry('b') }, { entry: entry('c') }],
      },
    ]

    expect(
      journeyTotals(groups, {
        a: { listening: 6, reading: 7 },
        b: { listening: 5 },
      })
    ).toEqual({
      booksDone: 1,
      steps: 3,
      testsDone: 1,
      totalBooks: 2,
      totalSteps: 6,
      totalTests: 3,
    })
  })
})

describe('journeySegments', () => {
  test('cuts the trail into stages with the steps left in each', () => {
    expect(journeySegments(5, 100)).toEqual([
      { from: 0, key: 'camp', left: 5, state: 'current', to: 0.1 },
      { from: 0.1, key: 'ridge', left: 20, state: 'ahead', to: 0.3 },
      { from: 0.3, key: 'peak', left: 30, state: 'ahead', to: 0.6 },
      { from: 0.6, key: 'summit', left: 40, state: 'ahead', to: 1 },
    ])
  })

  test('a reached milestone closes its stage', () => {
    expect(
      journeySegments(10, 100).map(segment => [segment.state, segment.left])
    ).toEqual([
      ['done', 0],
      ['current', 20],
      ['ahead', 30],
      ['ahead', 40],
    ])
    expect(
      journeySegments(100, 100).every(segment => segment.state === 'done')
    ).toBe(true)
  })
})

describe('stepsThisWeek', () => {
  test('counts finished attempts from the last seven days', () => {
    const now = new Date('2026-11-27T12:00:00Z')

    expect(
      stepsThisWeek(
        [
          { band: 6, startedAt: '2026-11-26T10:00:00Z', status: 'scored' },
          {
            band: null,
            startedAt: '2026-11-26T10:00:00Z',
            status: 'in_progress',
          },
          { band: 7, startedAt: '2026-11-01T10:00:00Z', status: 'scored' },
        ],
        now
      )
    ).toBe(1)
  })
})

describe('nextSkillOf', () => {
  test('returns the first skill without a band', () => {
    expect(nextSkillOf(entry('a'), { a: { listening: 6 } })).toBe('reading')
    expect(nextSkillOf(entry('a'), { a: { listening: 6, reading: 6 } })).toBe(
      null
    )
  })
})
