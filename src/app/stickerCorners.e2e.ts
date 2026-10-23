import { expect, type Page, test } from 'playwright/test'

// jsdom computes no stylesheet values, so this is the only check that the
// sticker radius knobs, the phone shell override, and the press transition
// actually reach the rendered page. Home renders without a database.
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Set PLAYWRIGHT_BASE_URL (and run `bun run dev`) to check the sticker corners.'
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

test('desktop: shell 20px, cards 14px, MangaButton eases its translate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  expect(await computed(page, '.manga-shell', 'border-top-left-radius')).toBe(
    '20px'
  )
  expect(
    await computed(page, '[data-slot="card"]', 'border-top-left-radius')
  ).toBe('14px')

  const openDictation = page.getByRole('link', { name: 'Open Dictation Lab' })
  const transition = await openDictation.evaluate(
    element => getComputedStyle(element).transitionProperty
  )
  expect(transition).toContain('translate')
})

test('phone: the shell corner drops to 14px, cards stay 14px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  expect(await computed(page, '.manga-shell', 'border-top-left-radius')).toBe(
    '14px'
  )
  expect(
    await computed(page, '[data-slot="card"]', 'border-top-left-radius')
  ).toBe('14px')
})

test('light-up: a pressed MangaButton drops its amber ledge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-theme', 'lightup')
  )

  const openDictation = page.getByRole('link', { name: 'Open Dictation Lab' })
  await openDictation.scrollIntoViewIfNeeded()
  const box = await openDictation.boundingBox()
  if (!box) throw new Error('Open Dictation Lab has no layout box')

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  // Past the 180ms press transition.
  await page.waitForTimeout(300)
  const pressedShadow = await openDictation.evaluate(
    element => getComputedStyle(element).boxShadow
  )
  await page.mouse.up()

  expect(pressedShadow).toBe('none')
})
