import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signIn, signOut } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/auth/auth', () => ({ signIn, signOut }))
// src/test/setup.ts stubs the actions module for component tests; this file
// tests the real one.
vi.unmock('@/lib/auth/actions')

const { signInAction, signOutAction } = await import('./actions')

function form(callbackUrl?: string) {
  const data = new FormData()

  if (callbackUrl !== undefined) data.set('callbackUrl', callbackUrl)

  return data
}

beforeEach(() => {
  signIn.mockClear()
  signOut.mockClear()
})

describe('signInAction', () => {
  it('signs in with Google and returns to the requested page', async () => {
    await signInAction(form('/grammar/lessons/u01-l01?x=1'))

    expect(signIn).toHaveBeenCalledWith('google', {
      redirectTo: '/grammar/lessons/u01-l01?x=1',
    })
  })

  it('sends an unsafe or missing callback home', async () => {
    for (const value of ['https://evil.example', '//evil.example', undefined]) {
      signIn.mockClear()
      await signInAction(form(value))

      expect(signIn).toHaveBeenCalledWith('google', { redirectTo: '/' })
    }
  })
})

describe('signOutAction', () => {
  it('lands on the login page', async () => {
    await signOutAction()

    expect(signOut).toHaveBeenCalledWith({ redirectTo: '/auth/login' })
  })
})
