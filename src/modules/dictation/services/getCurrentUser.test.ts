import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth, memoized } = vi.hoisted(() => ({
  auth: vi.fn(),
  memoized: [] as unknown[],
}))

vi.mock('@/lib/auth/auth', () => ({ auth }))
vi.mock('@/lib/auth/guestUser', () => ({
  getGuestId: vi.fn(),
  getOrCreateGuestId: vi.fn(),
}))

// Outside a React Server Components request React's cache() is a passthrough,
// so stand in a per-test memo to prove getOptionalUser is the wrapped function.
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()

  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => {
      memoized.push(fn)
      let result: ReturnType<T> | undefined
      return (() => (result ??= fn() as ReturnType<T>)) as T
    },
  }
})

const { getOptionalUser } = await import('./getCurrentUser')

describe('getOptionalUser', () => {
  beforeEach(() => auth.mockReset())

  it('is wrapped in React cache() so auth() runs once per request', async () => {
    auth.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', role: 'user', name: null },
    })

    const [first, second] = await Promise.all([
      getOptionalUser(),
      getOptionalUser(),
    ])

    expect(memoized).toHaveLength(1)
    expect(auth).toHaveBeenCalledTimes(1)
    expect(first).toEqual({
      id: 'u1',
      email: 'a@b.c',
      role: 'user',
      name: null,
      image: null,
    })
    expect(second).toBe(first)
  })
})
