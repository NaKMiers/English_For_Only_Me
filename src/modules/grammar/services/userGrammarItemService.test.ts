import { describe, expect, it } from 'vitest'

import { getItemStatusPatch } from './userGrammarItemService'

const NOW = new Date('2026-08-20T00:00:00.000Z')

describe('getItemStatusPatch', () => {
  it('puts a learning point at the bottom of the ladder, due now', () => {
    const patch = getItemStatusPatch({ now: NOW, status: 'learning' })

    expect(patch).toMatchObject({
      recallStage: 1,
      status: 'learning',
      dueAt: NOW,
      correctCount: 0,
      wrongCount: 0,
    })
  })

  it('stops scheduling an already-known point', () => {
    const patch = getItemStatusPatch({ now: NOW, status: 'alreadyKnow' })

    expect(patch).toMatchObject({
      status: 'alreadyKnow',
      dueAt: null,
      knownAt: NOW,
      knownReason: 'manual',
    })
  })

  it('stops scheduling an ignored point without marking it known', () => {
    const patch = getItemStatusPatch({ now: NOW, status: 'ignored' })

    expect(patch).toMatchObject({
      status: 'ignored',
      dueAt: null,
      knownAt: null,
      masteredAt: null,
    })
  })

  it('records a manual mastery reason distinct from recall mastery', () => {
    const patch = getItemStatusPatch({ now: NOW, status: 'mastered' })

    expect(patch).toMatchObject({
      status: 'mastered',
      dueAt: null,
      masteredAt: NOW,
      masteredReason: 'manual',
    })
  })

  it('never leaves a non-learning status scheduled', () => {
    for (const status of ['alreadyKnow', 'ignored', 'mastered'] as const)
      expect(
        getItemStatusPatch({ now: NOW, status }).dueAt,
        `${status} must not be scheduled`
      ).toBeNull()
  })
})
