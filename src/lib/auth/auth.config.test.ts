import { describe, expect, it } from 'vitest'

import { authConfig, authorizePage } from './auth.config'

function check(path: string, user?: { role: string }) {
  return authorizePage({
    auth: user ? { user } : null,
    request: { nextUrl: new URL(`https://efom.example${path}`) },
  })
}

describe('authorizePage', () => {
  it('lets anyone see the login page', () => {
    expect(check('/auth/login')).toBe(true)
    expect(check('/auth/login', { role: 'user' })).toBe(true)
  })

  it('sends a signed-out visitor away from every other page', () => {
    for (const path of [
      '/',
      '/dictation',
      '/grammar/lessons/u01-l01',
      '/ielts',
      '/vocabulary',
      '/admin',
    ])
      expect(check(path)).toBe(false)
  })

  it('lets a signed-in learner in', () => {
    expect(check('/dictation', { role: 'user' })).toBe(true)
    expect(check('/', { role: 'user' })).toBe(true)
  })

  it('keeps /admin for admins and sends a learner to the catalog', () => {
    expect(check('/admin', { role: 'admin' })).toBe(true)
    expect(check('/admin/dictation/import', { role: 'admin' })).toBe(true)

    const response = check('/admin/dictation/import', { role: 'user' })

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).headers.get('location')).toBe(
      'https://efom.example/dictation'
    )
  })

  it('does not treat a path that only starts with "admin" as admin', () => {
    expect(check('/administer', { role: 'user' })).toBe(true)
  })
})

describe('authConfig', () => {
  it('uses the one login page for sign-in and errors', () => {
    expect(authConfig.pages).toEqual({
      signIn: '/auth/login',
      error: '/auth/login',
    })
  })
})
