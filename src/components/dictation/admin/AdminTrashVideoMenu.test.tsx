import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/dictation/content/adminActions', () => ({
  purgeVideoAction: vi.fn(),
  restoreVideoAction: vi.fn(),
}))

import { AdminTrashVideoMenu } from './AdminTrashVideoMenu'

describe('AdminTrashVideoMenu', () => {
  it('keeps restore and permanent delete behind one menu button', async () => {
    render(
      <AdminTrashVideoMenu
        id="v1"
        title="Time management"
      />
    )

    expect(screen.queryByText('Restore')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Time management' })
    )

    expect(
      await screen.findByRole('menuitem', { name: 'Restore' })
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    expect(
      screen.getByRole('dialog', { name: 'Delete permanently?' })
    ).toBeTruthy()
  })
})
