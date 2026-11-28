import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ setUserVocabItemStatus: vi.fn() }))

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
vi.mock('@/modules/vocabulary/services/userVocabItemService', () => ({
  setUserVocabItemStatus: mocks.setUserVocabItemStatus,
}))

const { POST } = await import('./route')

beforeEach(() => {
  vi.stubEnv('MONGODB_URI', 'mongodb://example.invalid/test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/vocab/items', () => {
  // Before sign-in was required this saved the word anonymously.
  it('answers a signed-out learner with a 401 and saves nothing', async () => {
    const response = await POST(
      new Request('http://localhost/api/vocab/items', {
        body: JSON.stringify({
          status: 'shouldLearn',
          vocabEntryId: '6a5074f66c2397cc339c6e78',
        }),
        method: 'POST',
      })
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Please sign in to continue.',
    })
    expect(mocks.setUserVocabItemStatus).not.toHaveBeenCalled()
  })
})
