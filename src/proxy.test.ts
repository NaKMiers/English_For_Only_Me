import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it, vi } from 'vitest'

// The proxy module builds an Auth.js instance at import; only its matcher is
// under test here.
vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }))

const { config } = await import('./proxy')

function matches(url: string) {
  return unstable_doesMiddlewareMatch({ config, url })
}

describe('proxy matcher', () => {
  it('runs on every page, including the login page', () => {
    for (const url of [
      '/',
      '/auth/login',
      '/dictation',
      '/grammar/lessons/u01-l01',
      '/ielts/attempts/abc',
      '/vocabulary/words',
      '/admin',
      '/admin/dictation/import',
    ])
      expect(matches(url), url).toBe(true)
  })

  it('skips API routes, build output and public files', () => {
    for (const url of [
      '/api/dictation/sessions',
      '/api/auth/callback/google',
      '/_next/static/chunks/main.js',
      '/_next/image?url=%2Fbuddy%2Fready.png&w=256&q=75',
      '/buddy/ready.png',
      '/favicon.ico',
      '/site.webmanifest',
      '/robots.txt',
      '/fonts/app.woff2',
    ])
      expect(matches(url), url).toBe(false)
  })
})
