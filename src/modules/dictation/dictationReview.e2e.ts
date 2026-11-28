import { expect, test } from 'playwright/test'

const videoId = process.env.E2E_DICTATION_VIDEO_ID

test.skip(
  !process.env.PLAYWRIGHT_BASE_URL || !process.env.MONGODB_URI || !videoId,
  'Set PLAYWRIGHT_BASE_URL, MONGODB_URI and E2E_DICTATION_VIDEO_ID (a test account session) to run the review deep link flow.'
)

/**
 * The review queue opens the weak sentence itself (`?segment=`), a right
 * answer solves it, and the video's own practice is left where it was.
 */
test('review row -> weak sentence -> solved and gone', async ({ page }) => {
  // Make the first sentence weak: skip it (the skip reveals its text).
  await page.goto(`/dictation/videos/${videoId}/practice`)
  await page.getByRole('button', { name: /start dictation|continue/i }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  const answer = page.getByLabel('Type what you hear')
  const sentence = await answer.inputValue()

  await page.goto('/dictation/review')
  const row = page.getByRole('link', {
    name: new RegExp(sentence.slice(0, 20)),
  })
  await expect(row).toHaveAttribute('href', /\?segment=/)
  await row.first().click()

  await expect(page).toHaveURL(/practice\?segment=/)
  await page.getByRole('button', { name: /start dictation/i }).click()
  await page.getByLabel('Type what you hear').fill(sentence)
  await page.getByRole('button', { name: 'Check' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('region', { name: 'Next stop' })).toBeVisible()

  await page.goto('/dictation/review')
  await expect(
    page.getByRole('link', { name: new RegExp(sentence.slice(0, 20)) })
  ).toHaveCount(0)
})
