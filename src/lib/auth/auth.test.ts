import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  config: null as null | {
    callbacks: {
      signIn: (params: {
        user: { email?: string | null }
      }) => Promise<boolean | string>
    }
  },
  isEmailLocked: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: (config: typeof mocks.config) => {
    mocks.config = config

    return { auth: vi.fn(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() }
  },
}))
vi.mock('./accountStatus', () => ({ isEmailLocked: mocks.isEmailLocked }))
vi.mock('./userProvisioning', () => ({ provisionUserOnSignIn: vi.fn() }))

await import('./auth')

function signInCallback() {
  if (!mocks.config) throw new Error('NextAuth was not configured')

  return mocks.config.callbacks.signIn
}

beforeEach(() => {
  mocks.isEmailLocked.mockReset()
})

describe('signIn callback', () => {
  it('sends a locked account back with the locked notice', async () => {
    mocks.isEmailLocked.mockResolvedValue(true)

    await expect(
      signInCallback()({ user: { email: 'bob@example.com' } })
    ).resolves.toBe('/auth/login?error=AccountLocked')
    expect(mocks.isEmailLocked).toHaveBeenCalledWith('bob@example.com')
  })

  it('lets an active or brand-new account in', async () => {
    mocks.isEmailLocked.mockResolvedValue(false)

    await expect(
      signInCallback()({ user: { email: 'ann@example.com' } })
    ).resolves.toBe(true)
  })

  it('does not look up a profile without an email', async () => {
    await expect(signInCallback()({ user: { email: null } })).resolves.toBe(
      true
    )
    expect(mocks.isEmailLocked).not.toHaveBeenCalled()
  })
})
