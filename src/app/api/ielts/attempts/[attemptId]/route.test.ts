import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ readAttemptForOwner: vi.fn() }))

// The real requireUser runs; only the session read is stubbed: signed out.
vi.mock('@/lib/auth/auth', () => ({ auth: async () => null }))
vi.mock('@/i18n/server', async () => {
  const { en } =
    await vi.importActual<typeof import('@/i18n/messages/en')>(
      '@/i18n/messages/en'
    )

  return { getLocale: async () => 'en', getMessages: async () => en }
})
vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn(async () => undefined),
}))
vi.mock('@/modules/ielts/attempts/attemptService', async () => ({
  ...(await vi.importActual<object>('@/modules/ielts/attempts/attemptService')),
  readAttemptForOwner: mocks.readAttemptForOwner,
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.stubEnv('MONGODB_URI', 'mongodb://example.invalid/test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('GET /api/ielts/attempts/[attemptId]', () => {
  // Before sign-in was required this read an anonymous attempt.
  it('answers a signed-out learner with a 401 and reads nothing', async () => {
    const response = await GET(
      new Request('http://localhost/api/ielts/attempts/x'),
      { params: Promise.resolve({ attemptId: '6a5074f66c2397cc339c6e78' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Please sign in to continue.',
    })
    expect(mocks.readAttemptForOwner).not.toHaveBeenCalled()
  })
})
