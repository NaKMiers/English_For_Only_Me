import { Types } from 'mongoose'
import { afterEach, describe, expect, it, vi } from 'vitest'

const aggregate = vi.fn()

vi.mock('@/models/dictation/DictationAttemptModel', () => ({
  DictationAttemptModel: {
    aggregate: (...args: unknown[]) => aggregate(...args),
  },
}))

import { loadSegmentProgressRows } from './segmentProgressService'

const videoId = '507f1f77bcf86cd799439011'
const segmentId = '507f1f77bcf86cd799439013'

afterEach(() => vi.clearAllMocks())

describe('loadSegmentProgressRows', () => {
  it('queries nothing for a visitor without a practice identity', async () => {
    await expect(
      loadSegmentProgressRows({ userId: null, videoId })
    ).resolves.toEqual([])
    expect(aggregate).not.toHaveBeenCalled()
  })

  it('runs one aggregation scoped to the learner and video', async () => {
    const lastAttemptAt = new Date('2026-10-01T00:00:00.000Z')

    aggregate.mockResolvedValue([
      {
        _id: new Types.ObjectId(segmentId),
        action: 'reveal',
        attemptCount: 2,
        isPassed: false,
        lastAttemptAt,
      },
    ])

    const rows = await loadSegmentProgressRows({ userId: 'user-1', videoId })

    expect(aggregate).toHaveBeenCalledTimes(1)

    const [pipeline] = aggregate.mock.calls[0] as [
      Array<{ $match?: Record<string, unknown> }>,
    ]

    expect(pipeline[0].$match).toEqual({
      userId: 'user-1',
      videoId: new Types.ObjectId(videoId),
    })
    expect(rows).toEqual([
      {
        attemptCount: 2,
        attemptStatus: 'revealed',
        lastAttemptAt,
        segmentId,
      },
    ])
  })

  it('narrows to one segment when asked', async () => {
    aggregate.mockResolvedValue([])

    await loadSegmentProgressRows({ segmentId, userId: 'user-1', videoId })

    const [pipeline] = aggregate.mock.calls[0] as [
      Array<{ $match?: Record<string, unknown> }>,
    ]

    expect(pipeline[0].$match).toEqual({
      segmentId: new Types.ObjectId(segmentId),
      userId: 'user-1',
      videoId: new Types.ObjectId(videoId),
    })
  })
})
