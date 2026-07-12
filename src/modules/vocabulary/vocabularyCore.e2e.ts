import { expect, test } from 'playwright/test'

test.skip(
  !process.env.PLAYWRIGHT_BASE_URL || !process.env.MONGODB_URI,
  'Set PLAYWRIGHT_BASE_URL and MONGODB_URI to run the vocabulary smoke flow.'
)

test('search, learn, recall, and stats update', async ({ page }) => {
  await page.goto('/vocabulary')

  await page
    .getByRole('searchbox', { name: 'Search vocabulary term' })
    .fill(`example-${Date.now()}`)
  await page.getByRole('button', { name: /lookup/i }).click()
  await expect(page.getByText(/Loaded "/)).toBeVisible({ timeout: 15_000 })

  await page
    .getByRole('button', { name: /should learn/i })
    .first()
    .click()
  await expect(page.getByText(/recall queue/i)).toBeVisible()

  await page.getByRole('button', { name: /correct/i }).click()
  await expect(page.getByText(/moved to stage|Mastered/)).toBeVisible()
  await expect(page.getByText('Learning')).toBeVisible()
})
