import { describe, expect, it } from 'vitest'

import { resolveSessionCompletedAt } from './sessionCompletion'

const now = new Date('2026-10-24T10:00:00.000Z')
const earlier = new Date('2026-10-24T09:00:00.000Z')

describe('resolveSessionCompletedAt', () => {
  it('stamps now when an active session becomes completed', () => {
    expect(
      resolveSessionCompletedAt({
        completedAt: null,
        nextStatus: 'completed',
        now,
        previousStatus: 'active',
      })
    ).toBe(now)
  })

  it('keeps the original time on a duplicate completion', () => {
    expect(
      resolveSessionCompletedAt({
        completedAt: earlier,
        nextStatus: 'completed',
        now,
        previousStatus: 'completed',
      })
    ).toBe(earlier)
  })

  it('stamps now when a completed session has no completedAt yet', () => {
    expect(
      resolveSessionCompletedAt({
        completedAt: undefined,
        nextStatus: 'completed',
        now,
        previousStatus: 'completed',
      })
    ).toBe(now)
  })

  it('clears completedAt when the session leaves completed', () => {
    expect(
      resolveSessionCompletedAt({
        completedAt: earlier,
        nextStatus: 'active',
        now,
        previousStatus: 'completed',
      })
    ).toBeNull()
  })
})
