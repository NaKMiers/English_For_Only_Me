import { beforeEach, describe, expect, it, vi } from 'vitest'

import { toClientOwnerKey } from './clientOwnerKey'

const { auth, headerValue, memoized, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  headerValue: { current: null as string | null },
  memoized: [] as unknown[],
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))

vi.mock('@/lib/auth/auth', () => ({ auth }))
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers(
      headerValue.current ? { 'x-outbox-owner': headerValue.current } : {}
    ),
}))
vi.mock('next/navigation', () => ({ redirect }))

// Outside a React Server Components request React's cache() is a passthrough,
// so stand in a memo to prove getOptionalUser is the wrapped function. The
// memo is cleared per test so each test reads its own session.
const memo = vi.hoisted(() => ({ clear: [] as Array<() => void> }))

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()

  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => {
      memoized.push(fn)
      let result: ReturnType<T> | undefined
      memo.clear.push(() => {
        result = undefined
      })
      return (() => (result ??= fn() as ReturnType<T>)) as T
    },
  }
})

const {
  ForbiddenError,
  getOptionalUser,
  requireAdmin,
  requirePageUser,
  requireUser,
  UnauthenticatedError,
} = await import('./currentUser')
const { InvalidOwnerKeyError } = await import('./ownerKey')
const { OutboxOwnerMismatchError } = await import('./clientOwnerKey')

const USER_ID = '6a5074f66c2397cc339c6e78'

function signIn(id = USER_ID, role = 'user') {
  auth.mockResolvedValue({
    user: { id, email: 'a@b.c', role, name: 'Ann', image: null },
  })
}

beforeEach(() => {
  auth.mockReset()
  redirect.mockClear()
  headerValue.current = null
  for (const clear of memo.clear) clear()
})

describe('getOptionalUser', () => {
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

describe('requireUser', () => {
  it('throws a 401 without a session', async () => {
    auth.mockResolvedValue(null)

    const error = await requireUser().catch(caught => caught)

    expect(error).toBeInstanceOf(UnauthenticatedError)
    expect(error.status).toBe(401)
  })

  it('throws a 400 when the session id is not an ObjectId', async () => {
    signIn('not-an-object-id')

    const error = await requireUser().catch(caught => caught)

    expect(error).toBeInstanceOf(InvalidOwnerKeyError)
    expect(error.status).toBe(400)
  })

  it('throws a 409 when the outbox header names another learner', async () => {
    signIn()
    headerValue.current = toClientOwnerKey('c'.repeat(24))

    const error = await requireUser().catch(caught => caught)

    expect(error).toBeInstanceOf(OutboxOwnerMismatchError)
    expect(error.status).toBe(409)
  })

  // Before sign-in was required, a first visit queued writes as 'anonymous'
  // and they were accepted. Now no account may claim them.
  it('throws a 409 for an old anonymous outbox write', async () => {
    signIn()
    headerValue.current = 'anonymous'

    await expect(requireUser()).rejects.toBeInstanceOf(OutboxOwnerMismatchError)
  })

  it('returns the user when the header is absent or matches', async () => {
    signIn()

    await expect(requireUser()).resolves.toMatchObject({ id: USER_ID })

    for (const clear of memo.clear) clear()
    headerValue.current = toClientOwnerKey(USER_ID)

    await expect(requireUser()).resolves.toMatchObject({ id: USER_ID })
  })
})

describe('requirePageUser', () => {
  it('redirects to the login page without a session', async () => {
    auth.mockResolvedValue(null)

    await expect(requirePageUser()).rejects.toThrow('NEXT_REDIRECT /auth/login')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('returns the user when signed in', async () => {
    signIn()

    await expect(requirePageUser()).resolves.toMatchObject({ id: USER_ID })
    expect(redirect).not.toHaveBeenCalled()
  })
})

describe('requireAdmin', () => {
  it('throws a 403 for a learner and passes an admin', async () => {
    signIn()
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError)

    for (const clear of memo.clear) clear()
    signIn(USER_ID, 'admin')
    await expect(requireAdmin()).resolves.toMatchObject({ role: 'admin' })
  })
})
