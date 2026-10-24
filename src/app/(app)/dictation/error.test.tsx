import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import DictationError from './error'

describe('dictation error boundary', () => {
  test('keeps the recovery copy and retries on click', () => {
    const retry = vi.fn()
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(
      <DictationError
        error={new Error('boom')}
        unstable_retry={retry}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Dictation Lab needs a retry'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(retry).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
