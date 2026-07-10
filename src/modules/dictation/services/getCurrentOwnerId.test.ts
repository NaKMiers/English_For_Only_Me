import { afterEach, describe, expect, it, vi } from 'vitest'

import { ENV_KEYS } from '@/constants/environments'

import { getOptionalUser } from './getCurrentUser'
import { getCurrentOwnerId, PERSONAL_OWNER_ID } from './getCurrentOwnerId'

// Mock the session seam so this stays a unit test (no NextAuth / request ctx).
vi.mock('./getCurrentUser', () => ({ getOptionalUser: vi.fn() }))

const mockedGetOptionalUser = vi.mocked(getOptionalUser)

const originalEnv = {
  appOwnerId: process.env[ENV_KEYS.appOwnerId],
}

afterEach(() => {
  vi.mocked(getOptionalUser).mockReset()

  if (originalEnv.appOwnerId === undefined)
    delete process.env[ENV_KEYS.appOwnerId]
  else process.env[ENV_KEYS.appOwnerId] = originalEnv.appOwnerId
})

describe('getCurrentOwnerId', () => {
  it('uses a personal fallback when anonymous and no APP_OWNER_ID', async () => {
    mockedGetOptionalUser.mockResolvedValue(null)
    delete process.env[ENV_KEYS.appOwnerId]

    await expect(getCurrentOwnerId()).resolves.toBe(PERSONAL_OWNER_ID)
  })

  it('uses APP_OWNER_ID when configured and anonymous', async () => {
    mockedGetOptionalUser.mockResolvedValue(null)
    process.env[ENV_KEYS.appOwnerId] = '  owner-local-dev  '

    await expect(getCurrentOwnerId()).resolves.toBe('owner-local-dev')
  })

  it('uses the signed-in user id, ignoring the fallback', async () => {
    mockedGetOptionalUser.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'me@example.com',
      role: 'admin',
      name: null,
      image: null,
    })
    process.env[ENV_KEYS.appOwnerId] = 'owner-local-dev'

    await expect(getCurrentOwnerId()).resolves.toBe('507f1f77bcf86cd799439011')
  })
})
