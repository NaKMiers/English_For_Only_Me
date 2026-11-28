import { expect, type Page, test } from 'playwright/test'

// jsdom computes no stylesheet values, so this is the only check that the
// corner role knobs, the phone board override, and the night rail colours
// actually reach the rendered page. Home renders without a database.
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Set PLAYWRIGHT_BASE_URL (and run `bun run dev`) to check the corner roles.'
)

// The desktop rail. The phone tab bar is also a "Primary" navigation, so the
// rail is picked by its place in the sidebar.
const RAIL = 'aside nav[aria-label="Primary"]'

/** WCAG relative luminance of a computed `rgb(...)` colour, 0 (black) to 1. */
function luminance(color: string) {
  const channels = color
    .match(/\d+(\.\d+)?/g)
    ?.slice(0, 3)
    .map(Number)

  if (channels?.length !== 3) throw new Error(`Not an rgb colour: ${color}`)

  const [red, green, blue] = channels.map(value => {
    const channel = value / 255

    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

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
  await expect(page.locator(RAIL)).toBeVisible()
})

test('phone: the board fills the screen and the rail hides', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  expect(await computed(page, '.app-shell', 'border-top-left-radius')).toBe(
    '0px'
  )
  await expect(page.locator(RAIL)).toHaveCount(1)
  await expect(page.locator(RAIL)).toBeHidden()
  // The same links move to the floating tab bar, the only visible "Primary".
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
})

test('night: the rail stays dark while the board goes dark too', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const dayRail = luminance(await computed(page, RAIL, 'background-color'))
  const dayBoard = luminance(
    await computed(page, '.app-shell', 'background-color')
  )

  await page.evaluate(() =>
    document.documentElement.setAttribute('data-theme', 'lightup')
  )

  const nightRail = luminance(await computed(page, RAIL, 'background-color'))
  const nightBoard = luminance(
    await computed(page, '.app-shell', 'background-color')
  )

  // By day a dark rail beside a light board; at night both are dark, and the
  // rail stays a step darker than the board so it still reads as the rail.
  expect(dayRail).toBeLessThan(0.05)
  expect(dayBoard).toBeGreaterThan(0.8)
  expect(nightBoard).toBeLessThan(0.05)
  expect(nightRail).toBeLessThan(nightBoard)
})
