import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ENV_KEYS } from '@/constants/environments'

vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}))

const findOneAndUpdate = vi.fn()
vi.mock('@/models/UserModel', () => ({
  UserModel: {
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
  },
}))

const sessionUpdateMany = vi.fn()
const attemptUpdateMany = vi.fn()
const reviewUpdateMany = vi.fn()
const debriefUpdateMany = vi.fn()
vi.mock('@/models/dictation/DictationSessionModel', () => ({
  DictationSessionModel: {
    updateMany: (...a: unknown[]) => sessionUpdateMany(...a),
  },
}))
vi.mock('@/models/dictation/DictationAttemptModel', () => ({
  DictationAttemptModel: {
    updateMany: (...a: unknown[]) => attemptUpdateMany(...a),
  },
}))
vi.mock('@/models/dictation/DictationReviewItemModel', () => ({
  DictationReviewItemModel: {
    updateMany: (...a: unknown[]) => reviewUpdateMany(...a),
  },
}))
vi.mock('@/models/dictation/DictationDebriefModel', () => ({
  DictationDebriefModel: {
    updateMany: (...a: unknown[]) => debriefUpdateMany(...a),
  },
}))

import { provisionUserOnSignIn } from './userProvisioning'

const OWNER_ID = '507f1f77bcf86cd799439011'

const originalOwner = process.env[ENV_KEYS.ownerEmail]
const originalAppOwner = process.env[ENV_KEYS.appOwnerId]

beforeEach(() => {
  findOneAndUpdate.mockReturnValue({
    lean: () => Promise.resolve({ _id: OWNER_ID }),
  })
  for (const fn of [
    sessionUpdateMany,
    attemptUpdateMany,
    reviewUpdateMany,
    debriefUpdateMany,
  ])
    fn.mockResolvedValue({ modifiedCount: 3 })
  delete process.env[ENV_KEYS.appOwnerId]
})

afterEach(() => {
  vi.clearAllMocks()
  if (originalOwner === undefined) delete process.env[ENV_KEYS.ownerEmail]
  else process.env[ENV_KEYS.ownerEmail] = originalOwner
  if (originalAppOwner === undefined) delete process.env[ENV_KEYS.appOwnerId]
  else process.env[ENV_KEYS.appOwnerId] = originalAppOwner
})

describe('provisionUserOnSignIn', () => {
  it('claims legacy data only for the OWNER_EMAIL account', async () => {
    process.env[ENV_KEYS.ownerEmail] = 'owner@example.com'

    const result = await provisionUserOnSignIn({ email: 'Owner@Example.com' })

    expect(result.id).toBe(OWNER_ID)
    expect(sessionUpdateMany).toHaveBeenCalledWith(
      { ownerId: 'english-for-only-me-personal-owner' },
      { $set: { ownerId: OWNER_ID } }
    )
    expect(attemptUpdateMany).toHaveBeenCalledOnce()
    expect(reviewUpdateMany).toHaveBeenCalledOnce()
    expect(debriefUpdateMany).toHaveBeenCalledOnce()
  })

  it('does NOT claim for a non-owner account', async () => {
    process.env[ENV_KEYS.ownerEmail] = 'owner@example.com'

    await provisionUserOnSignIn({ email: 'someone-else@example.com' })

    expect(sessionUpdateMany).not.toHaveBeenCalled()
    expect(attemptUpdateMany).not.toHaveBeenCalled()
  })

  it('does NOT claim when OWNER_EMAIL is unset', async () => {
    delete process.env[ENV_KEYS.ownerEmail]

    await provisionUserOnSignIn({ email: 'owner@example.com' })

    expect(sessionUpdateMany).not.toHaveBeenCalled()
  })
})
