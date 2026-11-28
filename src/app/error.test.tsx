import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import RootError from './error'

describe('root error boundary', () => {
  test('uses the RouteError look, retries, and links back home', () => {
    const retry = vi.fn()
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(
      <RootError
        error={new Error('boom')}
        unstable_retry={retry}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This page needs a retry'
    )
    const retryButton = screen.getByRole('button', { name: 'Try again' })
    expect(retryButton.className).toContain('hover-pop')
    fireEvent.click(retryButton)
    expect(retry).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('link', { name: 'Back to the study desk' })
    ).toHaveAttribute('href', '/')
    consoleError.mockRestore()
  })
})
