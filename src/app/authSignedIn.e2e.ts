import { expect, test } from 'playwright/test'

// Runs in the `chromium` project, signed in as the seeded e2e learner.
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Set PLAYWRIGHT_BASE_URL (and run `bun run dev`) to check the signed-in gate.'
)

test('a signed-in learner skips the login page', async ({ page }) => {
  await page.goto('/auth/login?callbackUrl=%2Fgrammar')
  await expect(page).toHaveURL(/\/grammar$/)

  await page.goto('/auth/login?callbackUrl=https%3A%2F%2Fevil.example')
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$|localhost:\d+\/$/)
})

test('a signed-in learner sees no sign-in control', async ({ page }) => {
  await page.goto('/dictation')

  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Continue with Google' })
  ).toHaveCount(0)
})
