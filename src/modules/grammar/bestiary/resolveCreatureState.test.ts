import { describe, expect, it } from 'vitest'

import {
  GRAMMAR_REVIEW_STATUSES,
  GRAMMAR_USER_ITEM_STATUSES,
} from '@/modules/grammar/constants'

import { resolveCreatureState } from './resolveCreatureState'

describe('resolveCreatureState', () => {
  it('takes posture from progress alone', () => {
    for (const reviewStatus of GRAMMAR_REVIEW_STATUSES) {
      expect(resolveCreatureState({ reviewStatus, status: null }).posture).toBe(
        'untouched'
      )
      expect(
        resolveCreatureState({ reviewStatus, status: 'learning' }).posture
      ).toBe('fighting')
      expect(
        resolveCreatureState({ reviewStatus, status: 'alreadyKnow' }).posture
      ).toBe('skipped')
      expect(
        resolveCreatureState({ reviewStatus, status: 'mastered' }).posture
      ).toBe('defeated')
      expect(
        resolveCreatureState({ reviewStatus, status: 'ignored' }).posture
      ).toBe('dismissed')
    }
  })

  it('takes solidity from review status alone', () => {
    for (const status of [null, ...GRAMMAR_USER_ITEM_STATUSES] as const) {
      expect(
        resolveCreatureState({ reviewStatus: 'unverified', status }).solidity
      ).toBe('ghost')
      expect(
        resolveCreatureState({ reviewStatus: 'reviewed', status }).solidity
      ).toBe('solid')
    }
  })

  /**
   * The cell that justifies keeping the axes apart. `resolveGrammarAnswer` never
   * looks at `reviewStatus`, so this is reachable today: the learner beat the
   * drills on a lesson nobody has read. It must render as a defeated GHOST, not
   * as a normal win.
   */
  it('renders a mastered but unverified point as a defeated ghost', () => {
    expect(
      resolveCreatureState({ reviewStatus: 'unverified', status: 'mastered' })
    ).toEqual({ isResolved: true, posture: 'defeated', solidity: 'ghost' })
  })

  it('renders a mastered and reviewed point as a defeated solid', () => {
    // Reviewing the lesson is what turns the hollow win above into a real one.
    expect(
      resolveCreatureState({ reviewStatus: 'reviewed', status: 'mastered' })
    ).toEqual({ isResolved: true, posture: 'defeated', solidity: 'solid' })
  })

  it('covers all ten cells with a distinct state each', () => {
    const cells = new Set<string>()

    for (const reviewStatus of GRAMMAR_REVIEW_STATUSES)
      for (const status of [null, ...GRAMMAR_USER_ITEM_STATUSES] as const) {
        const state = resolveCreatureState({ reviewStatus, status })

        cells.add(`${state.posture}:${state.solidity}`)
      }

    expect(cells.size).toBe(10)
  })

  it('treats every finished posture as resolved and fighting as not', () => {
    const resolved = (status: 'learning' | 'mastered' | 'ignored' | null) =>
      resolveCreatureState({ reviewStatus: 'reviewed', status }).isResolved

    expect(resolved('mastered')).toBe(true)
    expect(resolved('ignored')).toBe(true)
    expect(resolved('learning')).toBe(false)
    expect(resolved(null)).toBe(false)
  })

  it('counts alreadyKnow as resolved', () => {
    // Declaring a point already known is a way of finishing with it, so the
    // creature should not read as still standing.
    expect(
      resolveCreatureState({ reviewStatus: 'reviewed', status: 'alreadyKnow' })
        .isResolved
    ).toBe(true)
  })
})
