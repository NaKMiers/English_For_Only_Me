import { describe, expect, it } from 'vitest'

import { formatLevelRange, isDictationLevel } from './levels'

describe('isDictationLevel', () => {
  it('accepts CEFR levels and rejects anything else', () => {
    expect(isDictationLevel('B1')).toBe(true)
    expect(isDictationLevel('D1')).toBe(false)
    expect(isDictationLevel(null)).toBe(false)
    expect(isDictationLevel('')).toBe(false)
  })
})

describe('formatLevelRange', () => {
  it('returns null when there are no levels', () => {
    expect(formatLevelRange([])).toBeNull()
    expect(formatLevelRange([null, undefined])).toBeNull()
  })

  it('returns a single level when only one distinct level is present', () => {
    expect(formatLevelRange(['B1', 'B1'])).toBe('B1')
  })

  it('returns a low–high span regardless of input order', () => {
    expect(formatLevelRange(['C1', 'A1', 'B2'])).toBe('A1–C1')
    expect(formatLevelRange(['A2', null, 'B1'])).toBe('A2–B1')
  })

  it('ignores non-CEFR noise', () => {
    expect(formatLevelRange(['A1', 'nonsense' as never, 'C2'])).toBe('A1–C2')
  })
})
