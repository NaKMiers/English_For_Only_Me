import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ recordGrammarSession: vi.fn() }))

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
vi.mock('@/modules/grammar/services/grammarProgressService', () => ({
  recordGrammarSession: mocks.recordGrammarSession,
}))

const { POST } = await import('./route')

beforeEach(() => {
  vi.stubEnv('MONGODB_URI', 'mongodb://example.invalid/test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('POST /api/grammar/sessions', () => {
  // Before sign-in was required this recorded the lesson anonymously.
  it('answers a signed-out learner with a 401 and records nothing', async () => {
    const response = await POST(
      new Request('http://localhost/api/grammar/sessions', {
        body: JSON.stringify({
          answers: [{ answer: 0, cardId: 'u01-l01-c02' }],
          idempotencyKey: 'key-12345678',
          mode: 'lesson',
          targetId: 'u01-l01',
        }),
        method: 'POST',
      })
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: 'Please sign in to continue.',
    })
    expect(mocks.recordGrammarSession).not.toHaveBeenCalled()
  })
})
