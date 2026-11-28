import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  loadTranslationTrack: vi.fn(),
}))

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
vi.mock('@/models/dictation/DictationVideoModel', () => ({
  DictationVideoModel: { findOne: mocks.findOne },
}))
vi.mock('@/modules/dictation/practice/practiceTranslations', () => ({
  loadTranslationTrack: mocks.loadTranslationTrack,
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.stubEnv('MONGODB_URI', 'mongodb://example.invalid/test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('GET /api/dictation/sessions/translations', () => {
  // Before sign-in was required this read was open to anyone.
  it('answers a signed-out visitor with a 401 and reads nothing', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/dictation/sessions/translations?videoId=6a5074f66c2397cc339c6e78&language=vi'
      )
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Please sign in to continue.',
    })
    expect(mocks.findOne).not.toHaveBeenCalled()
    expect(mocks.loadTranslationTrack).not.toHaveBeenCalled()
  })
})
