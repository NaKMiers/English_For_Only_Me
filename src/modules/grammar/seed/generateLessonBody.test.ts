import { describe, expect, it } from 'vitest'

import { withTargetsAccepted } from './generateLessonBody'

describe('withTargetsAccepted', () => {
  it('adds a missing target to acceptedAnswers', () => {
    const body = {
      drills: [
        { acceptedAnswers: ['Milk is good for you.'], target: 'Milk' },
      ],
    }

    withTargetsAccepted(body)

    expect(body.drills[0].acceptedAnswers).toEqual([
      'Milk',
      'Milk is good for you.',
    ])
  })

  it('leaves a drill alone when the target is already accepted', () => {
    const body = { drills: [{ acceptedAnswers: ['the'], target: 'the' }] }

    withTargetsAccepted(body)

    expect(body.drills[0].acceptedAnswers).toEqual(['the'])
  })

  /**
   * The grader already ignores case and terminal punctuation, so a match that
   * differs only by those is not a missing answer. Prepending a duplicate would
   * be harmless but noisy in the content file.
   */
  it('treats a case and punctuation variant as already accepted', () => {
    const body = {
      drills: [
        {
          acceptedAnswers: ['the book is mine'],
          target: 'The book is mine.',
        },
      ],
    }

    withTargetsAccepted(body)

    expect(body.drills[0].acceptedAnswers).toEqual(['the book is mine'])
  })

  it('handles a drill with no acceptedAnswers yet', () => {
    const body = { drills: [{ target: 'on' }] } as {
      drills: Array<{ acceptedAnswers?: string[]; target: string }>
    }

    withTargetsAccepted(body)

    expect(body.drills[0].acceptedAnswers).toEqual(['on'])
  })

  it('skips a drill with a blank target rather than accepting an empty string', () => {
    const body = { drills: [{ acceptedAnswers: ['the'], target: '   ' }] }

    withTargetsAccepted(body)

    expect(body.drills[0].acceptedAnswers).toEqual(['the'])
  })

  it('passes through a body with no drills array', () => {
    expect(withTargetsAccepted({ explanation: 'Body.' })).toEqual({
      explanation: 'Body.',
    })
    expect(withTargetsAccepted(null)).toBeNull()
  })
})
