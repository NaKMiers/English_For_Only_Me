/** The seeded test learner every signed-in Playwright test runs as. */
export const E2E_LEARNER = {
  email: 'e2e-learner@example.test',
  name: 'E2E Learner',
} as const

/** Where the global setup writes the minted session for the browser. */
export const E2E_STORAGE_STATE = 'playwright/.auth/learner.json'

/** Used when no database is configured: pages that need none still render. */
export const E2E_OFFLINE_USER_ID = '0000000000000000000000e2'
