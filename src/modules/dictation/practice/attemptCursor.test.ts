import { describe, expect, it } from 'vitest'

import {
  canRecordAttemptForSession,
  resolveAttemptCursor,
} from './attemptCursor'

const segmentOne = { id: 'seg-1', order: 0 }
const segmentTwo = { id: 'seg-2', order: 1 }
const segmentThree = { id: 'seg-3', order: 2 }

describe('resolveAttemptCursor', () => {
  it('advances past the attempted segment on a pass at the cursor', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentOne,
        currentSegmentId: segmentOne.id,
        nextSegment: segmentTwo,
        sessionStatus: 'active',
        shouldAdvance: true,
      })
    ).toEqual({ order: 1, segmentId: 'seg-2', type: 'move' })
  })

  // The race this fixes: the learner already moved to seg-3 and the cursor
  // PATCH landed first. The queued pass for seg-1 must still be accepted and
  // advance relative to the ATTEMPTED segment.
  it('advances relative to the attempted segment when the cursor moved ahead', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentOne,
        currentSegmentId: segmentThree.id,
        nextSegment: segmentTwo,
        sessionStatus: 'active',
        shouldAdvance: true,
      })
    ).toEqual({ order: 1, segmentId: 'seg-2', type: 'move' })
  })

  it('completes the session when the attempted segment is the last one', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentThree,
        currentSegmentId: segmentThree.id,
        nextSegment: null,
        sessionStatus: 'active',
        shouldAdvance: true,
      })
    ).toEqual({ type: 'complete' })
  })

  it('moves the cursor to the attempted segment on a non-advancing attempt elsewhere', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentTwo,
        currentSegmentId: segmentOne.id,
        nextSegment: null,
        sessionStatus: 'active',
        shouldAdvance: false,
      })
    ).toEqual({ order: 1, segmentId: 'seg-2', type: 'move' })
  })

  it('keeps the cursor on a non-advancing attempt at the cursor', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentTwo,
        currentSegmentId: segmentTwo.id,
        nextSegment: null,
        sessionStatus: 'active',
        shouldAdvance: false,
      })
    ).toEqual({ type: 'keep' })
  })

  it('moves to the attempted segment when the session has no cursor', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentOne,
        currentSegmentId: null,
        nextSegment: null,
        sessionStatus: 'active',
        shouldAdvance: false,
      })
    ).toEqual({ order: 0, segmentId: 'seg-1', type: 'move' })
  })

  it('never reopens or moves a completed session', () => {
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentOne,
        currentSegmentId: segmentThree.id,
        nextSegment: segmentTwo,
        sessionStatus: 'completed',
        shouldAdvance: true,
      })
    ).toEqual({ type: 'keep' })
    expect(
      resolveAttemptCursor({
        attemptedSegment: segmentOne,
        currentSegmentId: segmentThree.id,
        nextSegment: null,
        sessionStatus: 'completed',
        shouldAdvance: false,
      })
    ).toEqual({ type: 'keep' })
  })
})

describe('canRecordAttemptForSession', () => {
  it('records for active and completed sessions only', () => {
    expect(canRecordAttemptForSession('active')).toBe(true)
    expect(canRecordAttemptForSession('completed')).toBe(true)
    expect(canRecordAttemptForSession('abandoned')).toBe(false)
  })
})
