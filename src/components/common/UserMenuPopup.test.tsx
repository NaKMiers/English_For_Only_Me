import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { UserMenuPopup } from './UserMenuPopup'

function renderPopup(isAdmin = false) {
  const onMounted = vi.fn()

  render(
    <UserMenuPopup
      chip={<span>Alan</span>}
      isAdmin={isAdmin}
      onMounted={onMounted}
      signOutAction={async () => undefined}
      triggerClassName="chip"
    />
  )

  return { onMounted }
}

describe('UserMenuPopup', () => {
  test('mounts open with focus in the menu and reports it mounted', async () => {
    const { onMounted } = renderPopup()

    expect(
      await screen.findByRole('menuitem', { name: 'Favorites' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Admin' })).toBeNull()
    expect(onMounted).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Alan' })).toHaveClass('chip')
    // Keyboard users land in the menu, so arrow keys work right away.
    await waitFor(() => expect(screen.getByRole('menu')).toHaveFocus())
  })

  test('lists the admin console for admins', async () => {
    renderPopup(true)

    expect(
      await screen.findByRole('menuitem', { name: 'Admin' })
    ).toBeInTheDocument()
  })

  test('sign out asks for confirmation first', async () => {
    renderPopup()

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByText('Sign out?')).toBeInTheDocument()
  })
})
