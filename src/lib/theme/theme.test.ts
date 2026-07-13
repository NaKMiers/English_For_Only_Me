import { describe, expect, it } from 'vitest'

import {
  autoThemeForTime,
  manualState,
  nextThreshold,
  parseStoredTheme,
  resolveTheme,
  type StoredThemeState,
} from './theme'

/** Local-time Date at the given hour/minute today. */
function at(hour: number, minute = 0): Date {
  const d = new Date(2026, 6, 13, hour, minute, 0, 0)
  return d
}

describe('autoThemeForTime', () => {
  it('is light during the day (06:30 - 18:29)', () => {
    expect(autoThemeForTime(at(6, 30))).toBe('light')
    expect(autoThemeForTime(at(12, 0))).toBe('light')
    expect(autoThemeForTime(at(18, 29))).toBe('light')
  })

  it('is light-up in the evening and early morning', () => {
    expect(autoThemeForTime(at(18, 30))).toBe('lightup')
    expect(autoThemeForTime(at(23, 0))).toBe('lightup')
    expect(autoThemeForTime(at(0, 0))).toBe('lightup')
    expect(autoThemeForTime(at(6, 29))).toBe('lightup')
  })
})

describe('nextThreshold (3 rollover cases)', () => {
  it('before 06:30 -> 06:30 today', () => {
    expect(nextThreshold(at(3, 0))).toBe(at(6, 30).getTime())
  })

  it('between 06:30 and 18:30 -> 18:30 today', () => {
    expect(nextThreshold(at(15, 0))).toBe(at(18, 30).getTime())
  })

  it('after 18:30 -> 06:30 TOMORROW (midnight rollover)', () => {
    const expectedTomorrow = new Date(2026, 6, 14, 6, 30, 0, 0).getTime()
    expect(nextThreshold(at(20, 0))).toBe(expectedTomorrow)
    expect(nextThreshold(at(23, 0))).toBe(expectedTomorrow)
  })
})

describe('resolveTheme', () => {
  it('uses auto (time) when no stored state', () => {
    expect(resolveTheme(at(20, 0), null)).toBe('lightup')
    expect(resolveTheme(at(12, 0), null)).toBe('light')
  })

  it('uses auto when stored source is auto', () => {
    const stored: StoredThemeState = {
      theme: 'light',
      source: 'auto',
      expiresAt: null,
    }
    // 20:00 is auto-lightup; an auto stored 'light' must not stick
    expect(resolveTheme(at(20, 0), stored)).toBe('lightup')
  })

  it('honors an unexpired manual override', () => {
    // Manual light at 20:00 (auto would be lightup), valid until 06:30 tomorrow
    const stored = manualState('light', at(20, 0))
    expect(resolveTheme(at(21, 0), stored)).toBe('light')
  })

  it('drops an expired manual override and reverts to auto', () => {
    const stored = manualState('light', at(15, 0)) // expires 18:30 today
    // At 19:00 the override has expired; auto says lightup
    expect(resolveTheme(at(19, 0), stored)).toBe('lightup')
  })

  it('manual override at 23:00 lasts across midnight until 06:30 next day', () => {
    const stored = manualState('light', at(23, 0))
    const nextMorning = new Date(2026, 6, 14, 5, 0, 0, 0)
    expect(resolveTheme(nextMorning, stored)).toBe('light')
    const afterMorning = new Date(2026, 6, 14, 7, 0, 0, 0)
    expect(resolveTheme(afterMorning, stored)).toBe('light') // 07:00 auto is light anyway
    const nextEvening = new Date(2026, 6, 14, 20, 0, 0, 0)
    expect(resolveTheme(nextEvening, stored)).toBe('lightup') // override long expired
  })
})

describe('parseStoredTheme', () => {
  it('returns null for empty / malformed input', () => {
    expect(parseStoredTheme(null)).toBeNull()
    expect(parseStoredTheme('')).toBeNull()
    expect(parseStoredTheme('not json')).toBeNull()
    expect(parseStoredTheme('{}')).toBeNull()
    expect(parseStoredTheme('{"theme":"blue","source":"manual"}')).toBeNull()
    expect(
      parseStoredTheme('{"theme":"light","source":"nope","expiresAt":null}')
    ).toBeNull()
  })

  it('round-trips a valid manual state', () => {
    const state = manualState('lightup', at(20, 0))
    expect(parseStoredTheme(JSON.stringify(state))).toEqual(state)
  })
})
