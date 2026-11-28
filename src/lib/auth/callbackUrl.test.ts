import { describe, expect, it } from 'vitest'

import { loginUrlFor, safeCallbackUrl } from './callbackUrl'

const ORIGIN = 'https://efom.example'

describe('safeCallbackUrl', () => {
  it('keeps a same-origin path with its query and hash', () => {
    expect(safeCallbackUrl('/grammar')).toBe('/grammar')
    expect(safeCallbackUrl('/grammar/lessons/u01-l01?x=1#top')).toBe(
      '/grammar/lessons/u01-l01?x=1#top'
    )
  })

  it('turns an absolute same-origin URL into its path and search', () => {
    expect(safeCallbackUrl(`${ORIGIN}/dictation?topic=a`, ORIGIN)).toBe(
      '/dictation?topic=a'
    )
  })

  it('rejects other origins and protocol-relative paths', () => {
    for (const raw of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      'https://evil.example/grammar',
      'javascript:alert(1)',
      '/\t/evil.example',
    ])
      expect(safeCallbackUrl(raw, ORIGIN)).toBe('/')
  })

  it('rejects dot segments that normalize into a protocol-relative path', () => {
    for (const raw of [
      '/.//evil.example',
      '/..//evil.example',
      '/a/..//evil.example',
      '/%2e//evil.example',
      `${ORIGIN}/.//evil.example`,
    ])
      expect(safeCallbackUrl(raw, ORIGIN)).toBe('/')

    expect(loginUrlFor('/.//evil.example')).toBe('/auth/login')
  })

  it('still resolves harmless dot segments to a same-origin path', () => {
    expect(safeCallbackUrl('/grammar/../dictation')).toBe('/dictation')
  })

  it('rejects an absolute URL when the origin is unknown', () => {
    expect(safeCallbackUrl(`${ORIGIN}/grammar`)).toBe('/')
  })

  it('never returns to the login page or an API route', () => {
    expect(safeCallbackUrl('/auth/login')).toBe('/')
    expect(safeCallbackUrl('/auth/login?callbackUrl=/x')).toBe('/')
    expect(safeCallbackUrl(`${ORIGIN}/auth/login`, ORIGIN)).toBe('/')
    expect(safeCallbackUrl('/api/x')).toBe('/')
    expect(safeCallbackUrl('/api')).toBe('/')
  })

  it('falls back to / for empty or missing values', () => {
    expect(safeCallbackUrl('')).toBe('/')
    expect(safeCallbackUrl('   ')).toBe('/')
    expect(safeCallbackUrl(null)).toBe('/')
    expect(safeCallbackUrl(undefined)).toBe('/')
    expect(safeCallbackUrl('grammar')).toBe('/')
  })
})

describe('loginUrlFor', () => {
  it('carries the page back as callbackUrl', () => {
    expect(loginUrlFor('/grammar/lessons/u01-l01?x=1')).toBe(
      '/auth/login?callbackUrl=%2Fgrammar%2Flessons%2Fu01-l01%3Fx%3D1'
    )
  })

  it('drops the callback for home or an unsafe path', () => {
    expect(loginUrlFor('/')).toBe('/auth/login')
    expect(loginUrlFor('//evil.example')).toBe('/auth/login')
  })
})
