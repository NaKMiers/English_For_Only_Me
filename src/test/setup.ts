import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// The account server actions import the NextAuth / Mongoose chain, which the
// test runtime does not transform into action references. Stub them globally,
// so any component embedding AppTopbar (and its AccountControl) renders.
vi.mock('@/lib/auth/actions', () => ({
  signInAction: async () => undefined,
  signOutAction: async () => undefined,
}))

afterEach(() => {
  cleanup()
})
