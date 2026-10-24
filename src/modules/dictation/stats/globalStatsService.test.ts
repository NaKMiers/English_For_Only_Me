import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const lean = vi.fn(async (): Promise<unknown[]> => [])
  const select = vi.fn(() => ({ lean }))
  const limit = vi.fn(() => ({ select }))
  const sort = vi.fn(() => ({ limit }))

  return {
    attemptAggregate: vi.fn(async (): Promise<unknown[]> => []),
    attemptFind: vi.fn(() => ({ sort })),
    getCachedVideoCount: vi.fn(async () => 12),
    getCompletionCountsForUser: vi.fn(
      async () => new Map([['v1', 2]]) as Map<string, number>
    ),
    lean,
    limit,
    reviewCount: vi.fn(async () => 3),
    select,
    sort,
    videoCount: vi.fn(async () => 1),
  }
})

vi.mock('@/models/dictation/DictationAttemptModel', () => ({
  DictationAttemptModel: {
    aggregate: mocks.attemptAggregate,
    find: mocks.attemptFind,
  },
}))
vi.mock('@/models/dictation/DictationReviewItemModel', () => ({
  DictationReviewItemModel: { countDocuments: mocks.reviewCount },
}))
vi.mock('@/models/dictation/DictationVideoModel', () => ({
  DictationVideoModel: { countDocuments: mocks.videoCount },
}))
vi.mock('@/modules/dictation/content/catalogReaders', () => ({
  getCachedVideoCount: mocks.getCachedVideoCount,
}))
vi.mock('@/modules/dictation/content/progressRepository', () => ({
  getCompletionCountsForUser: mocks.getCompletionCountsForUser,
}))

const { getGlobalStatsForUser } = await import('./globalStatsService')
const { RECENT_TOKEN_ATTEMPT_LIMIT } = await import('./globalStats')

describe('getGlobalStatsForUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serves an anonymous viewer from the cached total with no queries', async () => {
    const stats = await getGlobalStatsForUser(null)

    expect(stats.totalVideoCount).toBe(12)
    expect(stats.completedVideoCount).toBe(0)
    expect(mocks.attemptFind).not.toHaveBeenCalled()
    expect(mocks.attemptAggregate).not.toHaveBeenCalled()
    expect(mocks.reviewCount).not.toHaveBeenCalled()
    expect(mocks.videoCount).not.toHaveBeenCalled()
  })

  it('reuses completion counts the caller already loads', async () => {
    const stats = await getGlobalStatsForUser('u1', {
      completionCounts: Promise.resolve(new Map([['v1', 1]])),
    })

    expect(mocks.getCompletionCountsForUser).not.toHaveBeenCalled()
    expect(mocks.videoCount).toHaveBeenCalledWith({ _id: { $in: ['v1'] } })
    expect(stats).toMatchObject({
      completedVideoCount: 1,
      dueReviewItemCount: 3,
      totalVideoCount: 12,
    })
  })

  it('aggregates history in MongoDB and reads only a capped token window', async () => {
    await getGlobalStatsForUser('u1')

    expect(mocks.getCompletionCountsForUser).toHaveBeenCalledWith('u1')

    const [pipeline] = mocks.attemptAggregate.mock.calls[0] as unknown as [
      Record<string, unknown>[],
    ]

    // The user filter comes first so the userId indexes serve the scan.
    expect(pipeline[0]).toEqual({ $match: { userId: 'u1' } })
    expect(Object.keys(pipeline[1].$facet as object).sort()).toEqual([
      'completedSegments',
      'firstChecks',
      'practiceDays',
      'practiceTime',
    ])
    expect(pipeline).toHaveLength(2)

    expect(mocks.attemptFind).toHaveBeenCalledWith({ userId: 'u1' })
    expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 })
    expect(mocks.limit).toHaveBeenCalledWith(RECENT_TOKEN_ATTEMPT_LIMIT)
    expect(mocks.select).toHaveBeenCalledWith({
      _id: 0,
      'feedbackTokens.expected': 1,
      'feedbackTokens.expectedOriginal': 1,
      'feedbackTokens.status': 1,
    })
    expect(mocks.reviewCount).toHaveBeenCalledWith({
      status: { $in: ['due', 'scheduled'] },
      userId: 'u1',
    })
  })

  it('maps the facet document and recent tokens into the stats', async () => {
    const today = new Date()

    mocks.attemptAggregate.mockResolvedValueOnce([
      {
        completedSegments: [{ count: 4 }],
        firstChecks: [{ correctCount: 3, createdAt: today, totalExpected: 4 }],
        practiceDays: [{ _id: today.toISOString().slice(0, 10) }],
        practiceTime: [{ monthly: 9_000, weekly: 2_000 }],
      },
    ])
    mocks.lean.mockResolvedValueOnce([
      { feedbackTokens: [{ expected: 'coffee', status: 'wrong' }] },
    ])

    const stats = await getGlobalStatsForUser('u1')

    expect(stats).toMatchObject({
      activeStreakDays: 1,
      completedSegmentCount: 4,
      monthlyPracticeTimeMs: 9_000,
      weakWords: [{ count: 1, word: 'coffee' }],
      weeklyPracticeTimeMs: 2_000,
    })
    expect(stats.firstTryAccuracyTrend.at(-1)?.accuracy).toBe(75)
  })
})
