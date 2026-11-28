import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  configured: true,
  user: null as { id: string } | null,
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))

vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  redirect: mocks.redirect,
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'efom.example' }),
}))
vi.mock('@/lib/auth/currentUser', () => ({
  getOptionalUser: async () => mocks.user,
}))
vi.mock('@/constants/environments', async importOriginal => ({
  ...(await importOriginal<typeof import('@/constants/environments')>()),
  hasGoogleAuth: () => mocks.configured,
}))
vi.mock('@/i18n/actions', () => ({ setLocaleAction: vi.fn() }))

const { default: LoginPage } = await import('./page')
const { noticeForError } = await import('./loginPageState')

async function renderPage(params: Record<string, string> = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) }))
}

beforeEach(() => {
  mocks.configured = true
  mocks.user = null
  mocks.redirect.mockClear()
})

describe('LoginPage', () => {
  it('sends a signed-in learner to the sanitised callback', async () => {
    mocks.user = { id: 'u1' }

    await expect(
      renderPage({ callbackUrl: 'https://efom.example/grammar?x=1' })
    ).rejects.toThrow('NEXT_REDIRECT /grammar?x=1')
  })

  it('sends a signed-in learner home from an unsafe callback', async () => {
    mocks.user = { id: 'u1' }

    for (const callbackUrl of ['https://evil.example', '//evil.example']) {
      await expect(renderPage({ callbackUrl })).rejects.toThrow(
        'NEXT_REDIRECT /'
      )
      expect(mocks.redirect).toHaveBeenLastCalledWith('/')
    }
  })

  it('renders exactly one call to action, carrying the callback', async () => {
    await renderPage({ callbackUrl: 'https://efom.example/dictation' })

    expect(
      screen.getByRole('button', { name: 'Continue with Google' })
    ).toBeVisible()
    expect(document.querySelectorAll('.bg-cta')).toHaveLength(1)
    expect(document.querySelector('input[name=callbackUrl]')).toHaveValue(
      '/dictation'
    )
  })

  it('fails closed when Google sign-in is not configured', async () => {
    mocks.configured = false

    await renderPage()

    expect(
      screen.queryByRole('button', { name: 'Continue with Google' })
    ).toBeNull()
    expect(screen.getByText(/Sign-in is not configured/)).toBeVisible()
  })

  it('explains an AccessDenied error', async () => {
    await renderPage({ error: 'AccessDenied' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Google sign-in was cancelled'
    )
  })

  it('shows a generic notice for an unknown error code', async () => {
    await renderPage({ error: 'SomethingNew' })

    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in did not work')
  })
})

describe('noticeForError', () => {
  it('maps the Auth.js codes', () => {
    expect(noticeForError(undefined, true)).toBeNull()
    expect(noticeForError('AccessDenied', true)).toBe('accessDenied')
    expect(noticeForError('Configuration', true)).toBe('notConfigured')
    expect(noticeForError('Verification', true)).toBe('generic')
    expect(noticeForError(null, false)).toBe('notConfigured')
  })
})
