import { describe, expect, it } from 'vitest'

import { sharedGroupHeaders } from './sharedGroupHeaders'

const ABC = 'Choose the correct letter, A, B or C.'
const group = (
  from: number,
  to = from,
  type:
    | 'multiple-choice'
    | 'multiple-choice-multi'
    | 'note-completion' = 'multiple-choice',
  instruction = ABC
) => ({ from, to, type, instruction })

describe('sharedGroupHeaders', () => {
  it('gives a run of one-question choice groups one header', () => {
    expect(
      sharedGroupHeaders([
        group(23, 24, 'multiple-choice-multi', 'Choose TWO letters, A-E.'),
        group(25),
        group(26),
        group(27),
      ])
    ).toEqual([{ from: 23, to: 24 }, { from: 25, to: 27 }, null, null])
  })

  it('starts a new header when the instruction changes', () => {
    expect(
      sharedGroupHeaders([
        group(1),
        group(2),
        group(
          3,
          3,
          'multiple-choice',
          'Choose the correct letter, A, B, C or D.'
        ),
      ])
    ).toEqual([{ from: 1, to: 2 }, null, { from: 3, to: 3 }])
  })

  it('keeps other group types apart', () => {
    expect(
      sharedGroupHeaders([
        group(1, 5, 'note-completion', 'Complete the notes.'),
        group(6),
      ])
    ).toEqual([
      { from: 1, to: 5 },
      { from: 6, to: 6 },
    ])
  })
})
