import { describe, expect, test } from 'vitest'

import { pickBuddyMood, type BuddyMoodInput } from './buddyMood'

const base: BuddyMoodInput = {
  hasStats: true,
  learnedToday: 0,
  streakDays: 1,
  totalDue: 5,
  weeklyMinutes: 10,
}

describe('pickBuddyMood', () => {
  test('waits quietly with no stats', () => {
    expect(pickBuddyMood({ ...base, hasStats: false, totalDue: 50 })).toBe(
      'ready'
    )
  })

  test('a pile of reviews wins over a long streak', () => {
    expect(pickBuddyMood({ ...base, streakDays: 30, totalDue: 20 })).toBe(
      'worried'
    )
  })

  test('a week-long streak makes it proud', () => {
    expect(pickBuddyMood({ ...base, streakDays: 7 })).toBe('proud')
  })

  test('an empty queue after studying makes it happy', () => {
    expect(pickBuddyMood({ ...base, totalDue: 0 })).toBe('happy')
    expect(
      pickBuddyMood({ ...base, learnedToday: 3, streakDays: 0, totalDue: 0 })
    ).toBe('happy')
  })

  test('a short streak with work waiting fires it up', () => {
    expect(pickBuddyMood({ ...base, streakDays: 3 })).toBe('fired')
  })

  test('a quiet week puts it to sleep', () => {
    expect(
      pickBuddyMood({ ...base, streakDays: 0, totalDue: 4, weeklyMinutes: 0 })
    ).toBe('sleepy')
  })

  test('otherwise it is ready', () => {
    expect(pickBuddyMood(base)).toBe('ready')
  })
})
