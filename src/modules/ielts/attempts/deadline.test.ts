import { describe, expect, it } from 'vitest'

import { computeDeadline, isPastGrace } from './deadline'

const START = new Date(Date.UTC(2026, 9, 28, 10, 0, 0))
const ms = (seconds: number) => START.getTime() + seconds * 1000

describe('computeDeadline', () => {
  it('reading and writing start at attempt creation', () => {
    const base = { startedAt: START, partDurationsSec: [], audioEvents: [] }

    expect(
      computeDeadline({ ...base, skill: 'reading', scope: { kind: 'skill' } })
    ).toEqual(new Date(ms(3600)))
    expect(
      computeDeadline({
        ...base,
        skill: 'reading',
        scope: { kind: 'part', part: 2 },
      })
    ).toEqual(new Date(ms(1200)))
    expect(
      computeDeadline({
        ...base,
        skill: 'writing',
        scope: { kind: 'part', part: 1 },
      })
    ).toEqual(new Date(ms(1200)))
    expect(
      computeDeadline({
        ...base,
        skill: 'writing',
        scope: { kind: 'part', part: 2 },
      })
    ).toEqual(new Date(ms(2400)))
  })

  it('listening has no deadline before audio starts', () => {
    expect(
      computeDeadline({
        skill: 'listening',
        scope: { kind: 'skill' },
        startedAt: START,
        partDurationsSec: [300, 300, 300, 300],
        audioEvents: [],
      })
    ).toBeNull()
  })

  it('re-anchors listening at each part start with previews and transfer', () => {
    const durations = [300, 320, 340, 360]
    const first = computeDeadline({
      skill: 'listening',
      scope: { kind: 'skill' },
      startedAt: START,
      partDurationsSec: durations,
      audioEvents: [{ kind: 'part-started', part: 1, atMs: ms(10) }],
    })

    // 10 + 300 + (30+320) + (30+340) + (30+360) + 120
    expect(first).toEqual(new Date(ms(1540)))

    const third = computeDeadline({
      skill: 'listening',
      scope: { kind: 'skill' },
      startedAt: START,
      partDurationsSec: durations,
      audioEvents: [
        { kind: 'part-started', part: 1, atMs: ms(10) },
        { kind: 'part-started', part: 3, atMs: ms(800) },
      ],
    })

    // 800 + 340 + (30+360) + 120
    expect(third).toEqual(new Date(ms(1650)))
  })

  it('adds at most two interruption gaps', () => {
    const deadline = computeDeadline({
      skill: 'listening',
      scope: { kind: 'part', part: 2 },
      startedAt: START,
      partDurationsSec: [300, 320, 340, 360],
      audioEvents: [
        { kind: 'part-started', part: 2, atMs: ms(0) },
        { kind: 'interrupted', atMs: ms(50), positionSec: 50 },
        { kind: 'resumed', atMs: ms(60), positionSec: 50 },
        { kind: 'interrupted', atMs: ms(100), positionSec: 90 },
        { kind: 'resumed', atMs: ms(105), positionSec: 90 },
        { kind: 'interrupted', atMs: ms(200), positionSec: 180 },
        { kind: 'resumed', atMs: ms(500), positionSec: 180 },
      ],
    })

    // 0 + 320 + 30 transfer + 10 + 5 gaps (the third is ignored)
    expect(deadline).toEqual(new Date(ms(365)))
  })
})

describe('isPastGrace', () => {
  it('allows 60 seconds after the deadline', () => {
    const deadline = new Date(ms(100))

    expect(isPastGrace(deadline, new Date(ms(160)))).toBe(false)
    expect(isPastGrace(deadline, new Date(ms(161)))).toBe(true)
    expect(isPastGrace(null, new Date(ms(10_000)))).toBe(false)
  })
})
