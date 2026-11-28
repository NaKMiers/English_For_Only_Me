import { describe, expect, it } from 'vitest'

import { formatCalendarDate, formatRelativeDate } from './formatUserDates'

const NOW = Date.parse('2026-11-28T12:00:00Z')

describe('formatRelativeDate', () => {
  it('says how long ago, in the chosen language', () => {
    expect(formatRelativeDate('2026-11-25T12:00:00Z', NOW, 'en')).toBe(
      '3 days ago'
    )
    expect(formatRelativeDate('2026-11-28T11:59:30Z', NOW, 'en')).toBe(
      'this minute'
    )
    expect(formatRelativeDate('2026-11-25T12:00:00Z', NOW, 'vi')).toBe(
      '3 ngày trước'
    )
  })

  it('is null without a date', () => {
    expect(formatRelativeDate(null, NOW, 'en')).toBeNull()
  })
})

describe('formatCalendarDate', () => {
  it('prints a short calendar date, or null', () => {
    expect(formatCalendarDate('2026-11-28T12:00:00Z', 'en')).toBe('28 Nov 2026')
    expect(formatCalendarDate(null, 'en')).toBeNull()
  })
})
