import { describe, expect, it } from 'vitest'

import {
  guestOwnerFilter,
  isGuestOwner,
  parseGuestCleanupArgs,
  planGuestCleanup,
  type GuestCleanupTarget,
} from './guestCleanup'

const TARGETS: GuestCleanupTarget[] = [
  { collection: 'dictationsessions', ownerField: 'userId' },
  { collection: 'ieltsattempts', ownerField: 'ownerId' },
  { collection: 'ieltsgradingledgers', ownerField: 'ownerId' },
]

describe('guest owner filter', () => {
  it('matches only ids that start with guest_', () => {
    expect(isGuestOwner(`guest_${'a'.repeat(32)}`)).toBe(true)
    expect(isGuestOwner('6a5074f66c2397cc339c6e78')).toBe(false)
    expect(isGuestOwner('my_guest_id')).toBe(false)
    expect(isGuestOwner(null)).toBe(false)
  })

  it('filters on the given owner field with an anchored regex', () => {
    expect(guestOwnerFilter('userId')).toEqual({
      userId: { $regex: '^guest_' },
    })
    expect(guestOwnerFilter('ownerId')).toEqual({
      ownerId: { $regex: '^guest_' },
    })
  })
})

describe('parseGuestCleanupArgs', () => {
  it('is a dry run unless both flags are given', () => {
    expect(parseGuestCleanupArgs([])).toEqual({ apply: false })
    expect(parseGuestCleanupArgs(['--apply'])).toEqual({ apply: false })
    expect(parseGuestCleanupArgs(['--i-am-sure'])).toEqual({ apply: false })
    expect(parseGuestCleanupArgs(['--apply', '--i-am-sure'])).toEqual({
      apply: true,
    })
  })
})

describe('planGuestCleanup', () => {
  const counts = { dictationsessions: 4, ieltsattempts: 2 }

  it('deletes nothing on a dry run, and still reports every count', () => {
    const plan = planGuestCleanup(TARGETS, counts, { apply: false })

    expect(plan.apply).toBe(false)
    expect(plan.total).toBe(6)
    expect(plan.steps.map(step => [step.collection, step.count])).toEqual([
      ['dictationsessions', 4],
      ['ieltsattempts', 2],
      ['ieltsgradingledgers', 0],
    ])
    expect(plan.steps.some(step => step.willDelete)).toBe(false)
  })

  it('deletes only collections that hold guest rows when applying', () => {
    const plan = planGuestCleanup(TARGETS, counts, { apply: true })

    expect(
      plan.steps.filter(step => step.willDelete).map(step => step.collection)
    ).toEqual(['dictationsessions', 'ieltsattempts'])
    expect(plan.steps[1].filter).toEqual({ ownerId: { $regex: '^guest_' } })
  })
})
