import { describe, expect, it } from 'vitest'

import {
  effectiveL1Risk,
  hasL1RiskDivergence,
  resolveL1RiskRank,
} from './effectiveL1Risk'

describe('effectiveL1Risk', () => {
  it('prefers the observed judgment when present', () => {
    expect(effectiveL1Risk({ l1Risk: 'medium', l1RiskObserved: 'high' })).toBe(
      'high'
    )
  })

  it('falls back to the authored risk when unjudged', () => {
    expect(effectiveL1Risk({ l1Risk: 'medium' })).toBe('medium')
  })

  it('treats an explicit null as unjudged', () => {
    // A row can be written back with an explicit null rather than the key being
    // deleted. That must read the same as absent, or clearing a judgment would
    // rank the point as undefined risk.
    expect(effectiveL1Risk({ l1Risk: 'low', l1RiskObserved: null })).toBe('low')
  })

  it('lets the observed value lower risk as well as raise it', () => {
    // Demotion is the common direction: `l1Risk` cannot be raised without the
    // content to back it, but it can always be judged easier than authored.
    expect(effectiveL1Risk({ l1Risk: 'high', l1RiskObserved: 'low' })).toBe(
      'low'
    )
  })
})

describe('hasL1RiskDivergence', () => {
  it('is false when unjudged', () => {
    expect(hasL1RiskDivergence({ l1Risk: 'high' })).toBe(false)
  })

  it('is false when the judgment agrees', () => {
    expect(
      hasL1RiskDivergence({ l1Risk: 'high', l1RiskObserved: 'high' })
    ).toBe(false)
  })

  it('is true when the judgment disagrees', () => {
    expect(
      hasL1RiskDivergence({ l1Risk: 'medium', l1RiskObserved: 'high' })
    ).toBe(true)
  })
})

describe('resolveL1RiskRank', () => {
  /**
   * This is the whole integration point. If the seed script ever ranks from the
   * raw `l1Risk` again, the builder's judgment stops reaching browse order and
   * the admin review queue - and nothing visibly breaks, the queue just shows
   * the wrong lessons.
   */
  it('ranks from the observed judgment, not the authored risk', () => {
    expect(resolveL1RiskRank({ l1Risk: 'low', l1RiskObserved: 'high' })).toBe(3)
    expect(resolveL1RiskRank({ l1Risk: 'high', l1RiskObserved: 'low' })).toBe(1)
  })

  it('ranks from the authored risk when unjudged', () => {
    expect(resolveL1RiskRank({ l1Risk: 'high' })).toBe(3)
    expect(resolveL1RiskRank({ l1Risk: 'medium' })).toBe(2)
    expect(resolveL1RiskRank({ l1Risk: 'low' })).toBe(1)
  })

  it('orders high above medium above low', () => {
    // The property the string enum could not provide, restated at the point
    // where it is actually written to the database.
    expect(resolveL1RiskRank({ l1Risk: 'high' })).toBeGreaterThan(
      resolveL1RiskRank({ l1Risk: 'medium' })
    )
    expect(resolveL1RiskRank({ l1Risk: 'medium' })).toBeGreaterThan(
      resolveL1RiskRank({ l1Risk: 'low' })
    )
  })
})
