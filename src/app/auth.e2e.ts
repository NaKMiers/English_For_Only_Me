import { expect, test } from 'playwright/test'

// Runs in the `signed-out` project: no session cookie at all.
test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Set PLAYWRIGHT_BASE_URL (and run `bun run dev`) to check the sign-in gate.'
)

const GATED_PAGES = [
  '/',
  '/dictation',
  '/grammar',
  '/ielts',
  '/vocabulary',
  '/grammar/lessons/u01-l01',
  '/admin',
]

test('every page sends a signed-out visitor to /auth/login with the way back', async ({
  baseURL,
  request,
}) => {
  for (const path of GATED_PAGES) {
    const response = await request.get(path, { maxRedirects: 0 })
    const location = new URL(
      response.headers().location ?? '',
      baseURL ?? 'http://127.0.0.1:3000'
    )

    expect(response.status(), path).toBe(307)
    expect(location.pathname, path).toBe('/auth/login')
    expect(
      new URL(location.searchParams.get('callbackUrl') ?? '').pathname,
      path
    ).toBe(path)
  }
})

test('a deep link lands on the login card and keeps its callback', async ({
  page,
}) => {
  await page.goto('/grammar/lessons/u01-l01')

  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'English For Only Me' })
  ).toBeVisible()
  await expect(page.locator('input[name=callbackUrl]')).toHaveValue(
    '/grammar/lessons/u01-l01'
  )
})

test('an unsafe callback is dropped on the login page', async ({ page }) => {
  for (const callbackUrl of ['https://evil.example', '//evil.example']) {
    await page.goto(
      `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    )

    const button = page.getByRole('button', { name: 'Continue with Google' })

    // Without Google OAuth configured the page fails closed: no form at all.
    if (await button.count())
      await expect(page.locator('input[name=callbackUrl]')).toHaveValue('/')
  }
})

test('per-user APIs answer 401 and the old anonymous endpoint is gone', async ({
  request,
}) => {
  const sessions = await request.post('/api/dictation/sessions', {
    data: { videoId: '6a5074f66c2397cc339c6e78' },
  })

  // 503 when the server has no database configured.
  if (sessions.status() !== 503) {
    expect(sessions.status()).toBe(401)
    expect(await sessions.json()).toEqual({
      message: 'Please sign in to continue.',
    })
  }

  // The endpoint that minted anonymous ids before sign-in was required.
  expect((await request.post('/api/guest')).status()).toBe(404)
})

test('the login page loads its public files while signed out', async ({
  request,
}) => {
  for (const path of [
    '/buddy/ready.png',
    '/favicon.ico',
    '/site.webmanifest',
    '/robots.txt',
  ])
    expect((await request.get(path)).status(), path).toBe(200)
})
