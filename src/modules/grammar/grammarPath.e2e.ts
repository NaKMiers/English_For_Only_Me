import { expect, test, type Page } from 'playwright/test'

test.skip(
  !process.env.PLAYWRIGHT_BASE_URL || !process.env.MONGODB_URI,
  'Set PLAYWRIGHT_BASE_URL and MONGODB_URI to run the grammar path smoke flow.'
)

/**
 * Answer whatever card is on screen without knowing the key: tap the first
 * option or token, type a filler, or tap every order tile. Right or wrong does
 * not matter here; finishing a lesson always earns at least one star.
 */
async function answerCurrentCard(page: Page) {
  const stage = page.locator('[data-slot=player-stage]')
  const input = stage.locator('input')

  if (await input.count()) {
    await input.fill('is')

    return
  }

  const pool = stage.locator('[role=group]').last()
  const label = await pool.getAttribute('aria-label')
  const tiles = pool.locator('button:not([disabled])')

  if (label === 'Các từ để xếp') {
    while (await tiles.count()) await tiles.first().click()

    return
  }

  await tiles.first().click()
}

async function playThrough(page: Page) {
  const action = page.locator('[data-slot=player-actions] button').last()

  for (let step = 0; step < 60; step += 1) {
    if (await page.getByRole('heading', { level: 1 }).count()) return

    if ((await action.textContent())?.includes('Kiểm tra'))
      await answerCurrentCard(page)

    await action.click()
  }

  throw new Error('The lesson did not finish within 60 steps.')
}

// A brand-new browser context has no guest cookie: this is a first visit.
test('a first-time guest finishes lesson 1 and unlocks lesson 2', async ({
  page,
}) => {
  await page.goto('/grammar')
  await expect(
    page.getByRole('heading', { name: 'Lộ trình ngữ pháp' })
  ).toBeVisible()

  await page.getByRole('link', { name: /Tiếp tục: am, is, are/ }).click()
  await expect(page).toHaveURL(/\/grammar\/lessons\/u01-l01$/)

  await playThrough(page)

  await expect(page.getByRole('heading', { name: 'Xong bài!' })).toBeVisible()
  await expect(page.getByRole('img', { name: /trên 3 sao/ })).toBeVisible()
  await expect(
    page.getByText('Mở khóa: Phủ định và câu hỏi với be')
  ).toBeVisible({ timeout: 15_000 })

  await page.getByRole('link', { name: 'Bài tiếp theo' }).click()
  await expect(page).toHaveURL(/\/grammar\/lessons\/u01-l02$/)

  await page.goto('/grammar')
  await expect(
    page.getByRole('button', { name: /Phủ định và câu hỏi với be, đang mở/ })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /am, is, are, đã học/ })
  ).toBeVisible()
})
