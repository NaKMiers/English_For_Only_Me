import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock('react-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  useFormStatus: () => ({ pending: formStatus.pending }),
}))

const { LoginCard } = await import('./LoginCard')

describe('LoginCard', () => {
  it('shows the brand, the welcome, the one button and the reassurance', () => {
    formStatus.pending = false
    const { container } = render(
      <LoginCard
        callbackUrl="/grammar"
        configured
        notice={null}
      />
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back' })
    ).toBeVisible()
    expect(screen.getByText('English For Only Me')).toBeVisible()
    expect(screen.getByText(/Listen, write and remember/)).toBeVisible()
    expect(screen.getByText(/Google is the only way in/)).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Continue with Google' })
    ).toBeEnabled()
    expect(
      container.querySelector('input[type=hidden][name=callbackUrl]')
    ).toHaveValue('/grammar')
    expect(screen.queryByRole('alert')).toBeNull()
    // The logo sits above the fold, so it must not wait to lazy-load.
    expect(container.querySelector('img[src*="logo"]')).toHaveAttribute(
      'loading',
      'eager'
    )
  })

  it('disables the button while the sign-in is posting', () => {
    formStatus.pending = true
    render(
      <LoginCard
        callbackUrl="/"
        configured
        notice={null}
      />
    )

    const button = screen.getByRole('button', { name: 'Opening Google...' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    formStatus.pending = false
  })

  it('has no button when sign-in is not configured', () => {
    render(
      <LoginCard
        callbackUrl="/"
        configured={false}
        notice="notConfigured"
      />
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sign-in is not configured'
    )
  })

  it('shows an error notice with the button still there', () => {
    render(
      <LoginCard
        callbackUrl="/"
        configured
        notice="accessDenied"
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Google sign-in was cancelled'
    )
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('tells a locked learner why, and keeps the button', () => {
    render(
      <LoginCard
        callbackUrl="/"
        configured
        notice="locked"
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This account has been locked'
    )
    expect(screen.getByRole('button')).toBeEnabled()
  })
})
