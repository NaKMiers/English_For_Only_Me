import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reviewItemFind: vi.fn(),
  updateMany: vi.fn(async () => ({ modifiedCount: 0 })),
}))

function selectLean<T>(value: T) {
  return { select: () => ({ lean: async () => value }) }
}

vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn(async () => undefined),
}))
vi.mock('@/lib/auth/guestUser', () => ({
  isGuestId: (id: string) => id.startsWith('guest-'),
}))
vi.mock('@/models/dictation/DictationAttemptModel', () => ({
  DictationAttemptModel: { updateMany: mocks.updateMany },
}))
vi.mock('@/models/dictation/DictationDebriefModel', () => ({
  DictationDebriefModel: { updateMany: mocks.updateMany },
}))
vi.mock('@/models/dictation/DictationReviewItemModel', () => ({
  DictationReviewItemModel: {
    find: mocks.reviewItemFind,
    updateMany: mocks.updateMany,
  },
}))
vi.mock('@/models/dictation/DictationSessionModel', () => ({
  DictationSessionModel: { updateMany: mocks.updateMany },
}))

import { mergeGuestDataIntoUser } from './mergeGuestData'

const guestId = 'guest-1'
const userId = 'user-1'

afterEach(() => vi.clearAllMocks())

describe('mergeGuestDataIntoUser review items', () => {
  it('dismisses guest items that duplicate an active user item before moving', async () => {
    mocks.reviewItemFind
      .mockReturnValueOnce(
        selectLean([
          { _id: 'g1', kind: 'segment', reason: 'skipped', segmentId: 's1' },
          {
            _id: 'g2',
            kind: 'segment',
            reason: 'lowAccuracy',
            segmentId: 's1',
          },
          { _id: 'g3', kind: 'segment', reason: 'skipped', segmentId: 's2' },
        ])
      )
      .mockReturnValueOnce(
        selectLean([
          { _id: 'u1', kind: 'segment', reason: 'skipped', segmentId: 's1' },
        ])
      )

    await mergeGuestDataIntoUser(guestId, userId)

    expect(mocks.reviewItemFind).toHaveBeenLastCalledWith({
      segmentId: { $in: ['s1', 's1', 's2'] },
      status: { $in: ['due', 'scheduled'] },
      userId,
    })
    expect(mocks.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['g1'] }, userId: guestId },
      { $set: { status: 'dismissed' } }
    )
    // The dismissal lands before the bulk move of the guest's rows.
    expect(mocks.updateMany.mock.calls[0]).toEqual([
      { _id: { $in: ['g1'] }, userId: guestId },
      { $set: { status: 'dismissed' } },
    ])
    expect(mocks.updateMany).toHaveBeenCalledWith(
      { userId: guestId },
      { $set: { userId } }
    )
  })

  it('skips the collision check when the guest has no active items', async () => {
    mocks.reviewItemFind.mockReturnValueOnce(selectLean([]))

    await mergeGuestDataIntoUser(guestId, userId)

    expect(mocks.reviewItemFind).toHaveBeenCalledTimes(1)
    expect(mocks.updateMany).toHaveBeenCalledTimes(4)
  })
})
