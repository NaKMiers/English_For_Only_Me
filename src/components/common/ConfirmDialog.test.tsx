import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  test('confirm runs the action and closes; cancel only closes', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ConfirmDialog
        cancelLabel="Keep going"
        confirmLabel="Restart"
        description="Your progress on this video resets."
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open
        title="Restart this video?"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
