import { defineConfig, devices } from 'playwright/test'

import { E2E_STORAGE_STATE } from './src/e2e/e2eLearner'

// Signed-out checks: the redirect to /auth/login and the public files.
const SIGNED_OUT_TESTS = /auth\.e2e\.ts$/

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // Mints a session for the seeded test learner (see src/e2e/globalSetup.ts).
  globalSetup: './src/e2e/globalSetup.ts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'signed-out',
      testMatch: SIGNED_OUT_TESTS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: SIGNED_OUT_TESTS,
      use: { ...devices['Desktop Chrome'], storageState: E2E_STORAGE_STATE },
    },
  ],
})
