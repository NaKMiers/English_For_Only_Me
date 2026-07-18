import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}))

const findOneAndUpdate = vi.fn()
vi.mock('@/models/UserModel', () => ({
  UserModel: {
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
  },
}))

import { provisionUserOnSignIn } from './userProvisioning'

const OWNER_ID = '507f1f77bcf86cd799439011'

beforeEach(() => {
  findOneAndUpdate.mockReturnValue({
    lean: () => Promise.resolve({ _id: OWNER_ID }),
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('provisionUserOnSignIn', () => {
  it('upserts the user by normalized email and returns the id', async () => {
    const result = await provisionUserOnSignIn({
      email: 'Owner@Example.com',
      name: 'Owner',
    })

    expect(result.id).toBe(OWNER_ID)
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { email: 'owner@example.com' },
      expect.objectContaining({
        $setOnInsert: { email: 'owner@example.com' },
      }),
      { returnDocument: 'after', upsert: true }
    )
  })
})
