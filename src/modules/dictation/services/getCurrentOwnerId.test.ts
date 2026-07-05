import { afterEach, describe, expect, it } from 'vitest'

import { ENV_KEYS } from '@/constants/environments'

import { getCurrentOwnerId, PERSONAL_OWNER_ID } from './getCurrentOwnerId'

const originalEnv = {
  appOwnerId: process.env[ENV_KEYS.appOwnerId],
}

afterEach(() => {
  if (originalEnv.appOwnerId === undefined)
    delete process.env[ENV_KEYS.appOwnerId]
  else process.env[ENV_KEYS.appOwnerId] = originalEnv.appOwnerId
})

describe('getCurrentOwnerId', () => {
  it('uses a personal fallback before auth exists', async () => {
    delete process.env[ENV_KEYS.appOwnerId]

    await expect(getCurrentOwnerId()).resolves.toBe(PERSONAL_OWNER_ID)
  })

  it('uses APP_OWNER_ID when configured', async () => {
    process.env[ENV_KEYS.appOwnerId] = '  owner-local-dev  '

    await expect(getCurrentOwnerId()).resolves.toBe('owner-local-dev')
  })
})
