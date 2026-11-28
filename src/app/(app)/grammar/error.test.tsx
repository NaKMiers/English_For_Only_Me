import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import GrammarError from './error'

describe('grammar error boundary', () => {
  test('shows the recovery copy, retries on click, links back to the path', () => {
    const retry = vi.fn()
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(
      <GrammarError
        error={new Error('boom')}
        unstable_retry={retry}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The grammar path needs a retry'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('link', { name: 'Back to the grammar path' })
    ).toHaveAttribute('href', '/grammar')
    consoleError.mockRestore()
  })
})
