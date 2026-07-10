import { describe, expect, it } from 'vitest'

import { getCurrentOwnerId, PERSONAL_OWNER_ID } from './getCurrentOwnerId'

describe('getCurrentOwnerId', () => {
  it('always resolves to the single shared owner (single-tenant)', async () => {
    await expect(getCurrentOwnerId()).resolves.toBe(PERSONAL_OWNER_ID)
  })
})
