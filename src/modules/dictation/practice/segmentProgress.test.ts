import { describe, expect, it } from 'vitest'

import {
  getAttemptSegmentStatus,
  getCheckSegmentStatus,
} from '@/modules/dictation/services/attemptRouteDecisions'

import {
  applyAttemptToProgress,
  buildSegmentProgressPipeline,
  getSegmentStatusForAttempt,
  overlaySegmentProgress,
  toSegmentProgressRow,
} from './segmentProgress'

const attemptedAt = new Date('2026-10-01T10:00:00.000Z')

function sharedSegment(id: string, overrides: Record<string, unknown> = {}) {
  return {
    attemptCount: 0,
    attemptStatus: 'notStarted' as const,
    id,
    lastAttemptAt: null as Date | null,
    order: Number(id.slice(-1)),
    text: `Sentence ${id}`,
    ...overrides,
  }
}

describe('getSegmentStatusForAttempt', () => {
  it.each([
    ['check', true, 'correct'],
    ['check', false, 'attemptedIncorrect'],
    ['reveal', false, 'revealed'],
    ['reveal', true, 'revealed'],
    ['skip', false, 'skipped'],
  ] as const)('%s isPassed=%s -> %s', (action, isPassed, expected) => {
    expect(getSegmentStatusForAttempt({ action, isPassed })).toBe(expected)
    // Parity with the route's own mapping.
    expect(
      getAttemptSegmentStatus(action) ?? getCheckSegmentStatus(isPassed)
    ).toBe(expected)
  })
})

describe('applyAttemptToProgress', () => {
  it('counts the attempt and takes its verdict', () => {
    expect(
      applyAttemptToProgress(
        {
          attemptCount: 2,
          attemptStatus: 'attemptedIncorrect',
          lastAttemptAt: null,
        },
        { action: 'check', createdAt: attemptedAt, isPassed: true }
      )
    ).toEqual({
      attemptCount: 3,
      attemptStatus: 'correct',
      lastAttemptAt: attemptedAt,
    })
    expect(
      applyAttemptToProgress(undefined, {
        action: 'skip',
        createdAt: attemptedAt,
        isPassed: false,
      })
    ).toEqual({
      attemptCount: 1,
      attemptStatus: 'skipped',
      lastAttemptAt: attemptedAt,
    })
  })
})

describe('toSegmentProgressRow', () => {
  it('maps the latest attempt and the count of one group', () => {
    expect(
      toSegmentProgressRow({
        _id: { toString: () => 'seg-1' },
        action: 'check',
        attemptCount: 3,
        isPassed: true,
        lastAttemptAt: attemptedAt,
      })
    ).toEqual({
      attemptCount: 3,
      attemptStatus: 'correct',
      lastAttemptAt: attemptedAt,
      segmentId: 'seg-1',
    })
  })
})

describe('overlaySegmentProgress', () => {
  it('applies the learner rows to their segments', () => {
    const result = overlaySegmentProgress(
      [sharedSegment('seg-1'), sharedSegment('seg-2')],
      [
        {
          attemptCount: 2,
          attemptStatus: 'attemptedIncorrect',
          lastAttemptAt: attemptedAt,
          segmentId: 'seg-2',
        },
      ]
    )

    expect(result[0]).toMatchObject({
      attemptCount: 0,
      attemptStatus: 'notStarted',
      id: 'seg-1',
      lastAttemptAt: null,
    })
    expect(result[1]).toMatchObject({
      attemptCount: 2,
      attemptStatus: 'attemptedIncorrect',
      id: 'seg-2',
      lastAttemptAt: attemptedAt,
      text: 'Sentence seg-2',
    })
  })

  // CRITICAL REGRESSION: legacy writes left another learner's verdict on the
  // shared DictationSegment document. A learner with no attempts must see none
  // of it.
  it('ignores progress stored on the shared segment for a learner with no attempts', () => {
    const polluted = sharedSegment('seg-1', {
      attemptCount: 7,
      attemptStatus: 'correct',
      lastAttemptAt: attemptedAt,
    })

    const [segment] = overlaySegmentProgress([polluted], [])

    expect(segment.attemptStatus).toBe('notStarted')
    expect(segment.attemptCount).toBe(0)
    expect(segment.lastAttemptAt).toBeNull()
  })

  it('replaces polluted shared progress with the learner own rows', () => {
    const polluted = sharedSegment('seg-1', {
      attemptCount: 7,
      attemptStatus: 'correct',
    })

    const [segment] = overlaySegmentProgress(
      [polluted],
      [
        {
          attemptCount: 1,
          attemptStatus: 'skipped',
          lastAttemptAt: attemptedAt,
          segmentId: 'seg-1',
        },
      ]
    )

    expect(segment).toMatchObject({ attemptCount: 1, attemptStatus: 'skipped' })
  })

  it('ignores rows for segments that are not on the page', () => {
    const result = overlaySegmentProgress(
      [sharedSegment('seg-1')],
      [
        {
          attemptCount: 4,
          attemptStatus: 'correct',
          lastAttemptAt: attemptedAt,
          segmentId: 'old-transcript-seg',
        },
      ]
    )

    expect(result).toHaveLength(1)
    expect(result[0].attemptStatus).toBe('notStarted')
  })
})

describe('buildSegmentProgressPipeline', () => {
  it('matches the owner first, sorts newest first, then groups per segment', () => {
    const match = { userId: 'user-1', videoId: 'video-1' }
    const pipeline = buildSegmentProgressPipeline(match)

    expect(pipeline[0]).toEqual({ $match: match })
    expect(pipeline[1]).toEqual({ $sort: { createdAt: -1 } })
    expect(pipeline[2]).toEqual({
      $group: {
        _id: '$segmentId',
        action: { $first: '$action' },
        attemptCount: { $sum: 1 },
        isPassed: { $first: '$isPassed' },
        lastAttemptAt: { $first: '$createdAt' },
      },
    })
  })
})
