import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const attemptFind = vi.fn()
const segmentFind = vi.fn()
const segmentFindOne = vi.fn()
const reviewItemFind = vi.fn()
const reviewItemInsertMany = vi.fn()

function chain<T>(value: T) {
  const query = {
    lean: () => Promise.resolve(value),
    sort: () => query,
  }

  return query
}

vi.mock('@/models/dictation/DictationAttemptModel', () => ({
  DictationAttemptModel: {
    find: (...args: unknown[]) => attemptFind(...args),
  },
}))
vi.mock('@/models/dictation/DictationSegmentModel', () => ({
  DictationSegmentModel: {
    find: (...args: unknown[]) => segmentFind(...args),
    findOne: (...args: unknown[]) => segmentFindOne(...args),
  },
}))
vi.mock('@/models/dictation/DictationReviewItemModel', () => ({
  DictationReviewItemModel: {
    find: (...args: unknown[]) => reviewItemFind(...args),
    insertMany: (...args: unknown[]) => reviewItemInsertMany(...args),
  },
}))

import {
  recomputeReviewItemsForSegment,
  selectNewReviewCandidates,
} from './reviewItemService'

const userId = 'user-1'
const videoId = '507f1f77bcf86cd799439011'
const transcriptId = '507f1f77bcf86cd799439012'
const sessionId = '507f1f77bcf86cd799439014'
const segmentA = '507f1f77bcf86cd799439021'
const segmentB = '507f1f77bcf86cd799439022'
const segmentC = '507f1f77bcf86cd799439023'
const now = new Date('2026-10-24T00:00:00.000Z')

function segmentDoc(id: string, order: number, text: string) {
  return {
    _id: id,
    createdAt: now,
    normalizedText: text.toLowerCase(),
    order,
    text,
    transcriptId,
    transcriptSourceHash: 'hash',
    updatedAt: now,
    videoId,
  }
}

let attemptCounter = 0

function attemptDoc(
  segmentId: string,
  action: 'check' | 'reveal' | 'skip',
  isPassed: boolean,
  accuracy: number,
  mistakes: Array<'extra' | 'missing' | 'wrong'> = []
) {
  attemptCounter += 1

  return {
    _id: `attempt-${attemptCounter}`,
    action,
    createdAt: new Date(now.getTime() + attemptCounter * 1000),
    expectedTextSnapshot: 'text',
    feedbackTokens: mistakes.map(status => ({ status })),
    idempotencyKey: `key-${attemptCounter}`,
    isPassed,
    segmentId,
    sessionId,
    stats: {
      accuracy,
      correctCount: Math.round(accuracy / 10),
      extraCount: 0,
      missingCount: 0,
      spellingVariantCount: 0,
      totalExpected: 10,
      wrongCount: 0,
    },
    transcriptId,
    updatedAt: now,
    userId,
    videoId,
  }
}

const segments = [
  segmentDoc(segmentA, 0, 'First sentence here.'),
  segmentDoc(segmentB, 1, 'Second sentence here.'),
  segmentDoc(segmentC, 2, 'Third sentence here.'),
]
const attempts = [
  attemptDoc(segmentA, 'check', false, 40, ['wrong', 'wrong']),
  attemptDoc(segmentB, 'skip', false, 0),
  attemptDoc(segmentA, 'check', false, 60, ['missing']),
  attemptDoc(segmentC, 'check', true, 100),
  attemptDoc(segmentA, 'check', false, 80),
  attemptDoc(segmentA, 'check', true, 100),
  attemptDoc(segmentB, 'reveal', false, 0),
]
const existingItems = [
  { kind: 'segment', reason: 'skipped', segmentId: segmentB },
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('selectNewReviewCandidates parity', () => {
  it.each([segmentA, segmentB, segmentC])(
    'segment-scoped candidates for %s equal the video-wide ones for it',
    segmentId => {
      const videoWide = selectNewReviewCandidates({
        attempts,
        existingItems,
        segments,
      }).filter(candidate => candidate.segmentId === segmentId)
      const scoped = selectNewReviewCandidates({
        attempts: attempts.filter(attempt => attempt.segmentId === segmentId),
        existingItems: existingItems.filter(
          item => item.segmentId === segmentId
        ),
        segments: segments.filter(segment => segment._id === segmentId),
      })

      expect(scoped).toEqual(videoWide)
    }
  )

  it('the fixture exercises several reasons and an existing item', () => {
    const reasons = selectNewReviewCandidates({
      attempts,
      existingItems,
      segments,
    }).map(candidate => `${candidate.segmentId}:${candidate.reason}`)

    expect(reasons).toEqual(
      expect.arrayContaining([
        `${segmentA}:highRetry`,
        `${segmentA}:lowAccuracy`,
        `${segmentA}:repeatedMistake`,
        `${segmentB}:revealed`,
      ])
    )
    // Already active, so not created again.
    expect(reasons).not.toContain(`${segmentB}:skipped`)
    expect(reasons.some(reason => reason.startsWith(segmentC))).toBe(false)
  })
})

describe('recomputeReviewItemsForSegment', () => {
  it('queries only the attempted segment and inserts its new candidates', async () => {
    const segmentAttempts = attempts.filter(
      attempt => attempt.segmentId === segmentA
    )

    attemptFind.mockReturnValue(chain(segmentAttempts))
    segmentFindOne.mockReturnValue(chain(segments[0]))
    reviewItemFind.mockReturnValue(chain([]))
    reviewItemInsertMany.mockImplementation(async (docs: unknown[]) =>
      docs.map((doc, index) => ({
        toObject: () => ({
          ...(doc as Record<string, unknown>),
          _id: `item-${index}`,
          createdAt: now,
          updatedAt: now,
        }),
      }))
    )

    const items = await recomputeReviewItemsForSegment({
      segmentId: segmentA,
      userId,
      videoId,
    })

    expect(attemptFind).toHaveBeenCalledWith({ segmentId: segmentA, userId })
    expect(segmentFindOne).toHaveBeenCalledWith({ _id: segmentA, videoId })
    expect(segmentFind).not.toHaveBeenCalled()
    expect(reviewItemFind).toHaveBeenCalledWith(
      expect.objectContaining({ segmentId: segmentA, userId, videoId })
    )
    expect(items.map(item => item.reason).sort()).toEqual(
      ['highRetry', 'lowAccuracy', 'repeatedMistake'].sort()
    )
    expect(items.every(item => item.segmentId === segmentA)).toBe(true)
  })

  it('inserts nothing for a cleanly passed segment', async () => {
    attemptFind.mockReturnValue(
      chain(attempts.filter(attempt => attempt.segmentId === segmentC))
    )
    segmentFindOne.mockReturnValue(chain(segments[2]))
    reviewItemFind.mockReturnValue(chain([]))

    await expect(
      recomputeReviewItemsForSegment({ segmentId: segmentC, userId, videoId })
    ).resolves.toEqual([])
    expect(reviewItemInsertMany).not.toHaveBeenCalled()
  })

  function toInsertedDoc(doc: unknown, index: number) {
    return {
      toObject: () => ({
        ...(doc as Record<string, unknown>),
        _id: `item-${index}`,
        createdAt: now,
        updatedAt: now,
      }),
    }
  }

  function mockSegmentA() {
    attemptFind.mockReturnValue(
      chain(attempts.filter(attempt => attempt.segmentId === segmentA))
    )
    segmentFindOne.mockReturnValue(chain(segments[0]))
    reviewItemFind.mockReturnValue(chain([]))
  }

  // Mongoose's unordered insertMany failure: write errors copied into plain
  // objects (the driver's `code` getter is lost, `err.code` survives), plus
  // the rows that did land.
  function bulkWriteError(codes: number[], insertedDocs: unknown[]) {
    return Object.assign(new Error('bulk write failed'), {
      code: codes[0],
      insertedDocs,
      writeErrors: codes.map((code, index) => ({ err: { code }, index })),
    })
  }

  it('tolerates a concurrent recompute that inserted the same item first', async () => {
    mockSegmentA()
    reviewItemInsertMany.mockImplementation(async (docs: unknown[]) => {
      // The other request already holds the first candidate.
      throw bulkWriteError([11000], docs.slice(1).map(toInsertedDoc))
    })

    const items = await recomputeReviewItemsForSegment({
      segmentId: segmentA,
      userId,
      videoId,
    })

    expect(reviewItemInsertMany).toHaveBeenCalledWith(expect.any(Array), {
      ordered: false,
    })
    expect(items).toHaveLength(2)
  })

  it('returns nothing new when every candidate already exists', async () => {
    mockSegmentA()
    reviewItemInsertMany.mockRejectedValue(
      bulkWriteError([11000, 11000, 11000], [])
    )

    await expect(
      recomputeReviewItemsForSegment({ segmentId: segmentA, userId, videoId })
    ).resolves.toEqual([])
  })

  it('still throws when a write fails for another reason', async () => {
    mockSegmentA()
    reviewItemInsertMany.mockRejectedValue(bulkWriteError([11000, 121], []))

    await expect(
      recomputeReviewItemsForSegment({ segmentId: segmentA, userId, videoId })
    ).rejects.toThrow('bulk write failed')
  })
})
