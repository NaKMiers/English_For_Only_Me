import { describe, expect, test } from 'vitest'

import { pickNextStop } from './nextStop'

describe('pickNextStop', () => {
  test('resume beats due beats next', () => {
    expect(
      pickNextStop([
        { data: 'new', kind: 'next' },
        { data: 'due', kind: 'due' },
        { data: 'half-done', kind: 'resume' },
      ])
    ).toEqual({ data: 'half-done', kind: 'resume' })

    expect(
      pickNextStop([
        { data: 'new', kind: 'next' },
        { data: 'due', kind: 'due' },
      ])
    ).toEqual({ data: 'due', kind: 'due' })
  })

  test('ties keep the input order', () => {
    expect(
      pickNextStop([
        { data: 'first', kind: 'due' },
        { data: 'second', kind: 'due' },
      ])
    ).toEqual({ data: 'first', kind: 'due' })
  })

  test('no candidates (a brand new learner, everything done) is done', () => {
    expect(pickNextStop([])).toEqual({ kind: 'done' })
    expect(pickNextStop([null, undefined, false])).toEqual({ kind: 'done' })
  })
})
