import { describe, expect, test } from 'vitest'

import {
  getDebriefCompletionBlocker,
  parseDebriefPayload,
} from './debriefDecisions'

describe('debrief route decisions', () => {
  test('validates the debrief payload', () => {
    const decision = parseDebriefPayload({
      notes: 'Numbers were hard.',
      videoId: '507f1f77bcf86cd799439011',
    })

    expect(decision.ok).toBe(true)
    if (decision.ok) expect(decision.data.notes).toBe('Numbers were hard.')
  })

  test('blocks debrief generation before completion', () => {
    expect(
      getDebriefCompletionBlocker({
        completedSegmentCount: 8,
        hasCompletedSession: false,
      })
    ).toBe('Complete this video before debriefing.')
    expect(
      getDebriefCompletionBlocker({
        completedSegmentCount: 0,
        hasCompletedSession: true,
      })
    ).toBe('Finish at least one saved segment before debriefing.')
    expect(
      getDebriefCompletionBlocker({
        completedSegmentCount: 8,
        hasCompletedSession: true,
      })
    ).toBeNull()
  })
})
