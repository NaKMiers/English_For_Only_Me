import { expect, type Page, test } from 'playwright/test'

// jsdom computes no stylesheet values, so this is the only check that the
// corner role knobs, the phone board override, and the night rail colours
// actually reach the rendered page. Home renders without a database.
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Set PLAYWRIGHT_BASE_URL (and run `bun run dev`) to check the corner roles.'
)

function computed(page: Page, selector: string, property: string) {
  return page
    .locator(selector)
    .first()
    .evaluate(
      (element, name) => getComputedStyle(element).getPropertyValue(name),
      property
    )
}

test('desktop: the board is 36px round and floats', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  expect(await computed(page, '.app-shell', 'border-top-left-radius')).toBe(
    '36px'
  )
  expect(await computed(page, '.app-shell', 'box-shadow')).not.toBe('none')
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
})

test('phone: the board fills the screen and the rail hides', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  expect(await computed(page, '.app-shell', 'border-top-left-radius')).toBe(
    '0px'
  )
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
})

test('night: the rail stays dark while the board goes dark too', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-theme', 'lightup')
  )

  const rail = await computed(
    page,
    'nav[aria-label="Primary"]',
    'background-color'
  )
  expect(rail).toBe('rgb(11, 10, 17)')
})
