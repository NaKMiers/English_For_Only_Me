import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// AuthControl is an async server component (reads the JWT session via NextAuth).
// It cannot render under the synchronous test renderers used here, so stub it
// globally — any component embedding AppTopbar renders without it.
vi.mock('@/components/common/AuthControl', () => ({
  AuthControl: () => null,
}))

afterEach(() => {
  cleanup()
})
