import { describe, expect, it } from 'vitest'

import { formatClock, lineIndexAt, lineSeekTarget } from './audioTimeline'

const OFFSETS = [0, 4, 9.5, 15]

describe('formatClock', () => {
  it('formats minutes and padded seconds', () => {
    expect(formatClock(413.6)).toBe('6:53')
  })

  it('treats NaN and negatives as zero', () => {
    expect(formatClock(Number.NaN)).toBe('0:00')
    expect(formatClock(-3)).toBe('0:00')
  })
})

describe('lineIndexAt', () => {
  it('picks the last line that has started', () => {
    expect(lineIndexAt(OFFSETS, 9.5)).toBe(2)
    expect(lineIndexAt(OFFSETS, 14.9)).toBe(2)
    expect(lineIndexAt(OFFSETS, 99)).toBe(3)
  })

  it('returns -1 without timings or before the first line', () => {
    expect(lineIndexAt([], 5)).toBe(-1)
    expect(lineIndexAt([2, 6], 1)).toBe(-1)
  })
})

describe('lineSeekTarget', () => {
  it('steps to the next line', () => {
    expect(lineSeekTarget(OFFSETS, 5, 1)).toBe(9.5)
    expect(lineSeekTarget(OFFSETS, 16, 1)).toBeNull()
  })

  it('restarts the current line, then steps back on a second press', () => {
    expect(lineSeekTarget(OFFSETS, 12, -1)).toBe(9.5)
    expect(lineSeekTarget(OFFSETS, 9.5, -1)).toBe(4)
    expect(lineSeekTarget(OFFSETS, 0.2, -1)).toBe(0)
  })

  it('has no target without timings', () => {
    expect(lineSeekTarget([], 5, 1)).toBeNull()
  })
})
