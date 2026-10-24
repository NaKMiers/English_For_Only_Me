import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { UserMenu } from './UserMenu'

const { popupModule } = vi.hoisted(() => ({ popupModule: { loaded: false } }))

vi.mock('./UserMenuPopup', () => {
  popupModule.loaded = true

  return {
    UserMenuPopup: ({
      chip,
      onMounted,
    }: {
      chip: React.ReactNode
      onMounted: () => void
    }) => {
      useLayoutEffect(onMounted, [onMounted])

      return (
        <>
          <button
            type="button"
            aria-expanded
          >
            {chip}
          </button>
          <div role="menu">Favorites</div>
        </>
      )
    },
  }
})

function renderMenu() {
  return render(
    <UserMenu
      label="Alan"
      initial="A"
      isAdmin={false}
      signOutAction={async () => undefined}
    />
  )
}

describe('UserMenu', () => {
  // Order matters: the mocked module evaluates once per file, so the "not
  // imported yet" checks run before anything loads the popup.
  test('first render is a plain chip and does not import the popup', () => {
    renderMenu()

    const chip = screen.getByRole('button', { name: /Alan/ })
    expect(chip).toHaveAttribute('aria-haspopup', 'menu')
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(popupModule.loaded).toBe(false)
  })

  test('hover prefetches the popup chunk without opening it', async () => {
    renderMenu()

    fireEvent.pointerEnter(screen.getByRole('button', { name: /Alan/ }))

    await waitFor(() => expect(popupModule.loaded).toBe(true))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('opens the lazily loaded menu on click and swaps the chip', async () => {
    renderMenu()

    fireEvent.click(screen.getByRole('button', { name: /Alan/ }))

    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(popupModule.loaded).toBe(true)
    // Exactly one chip on screen once the real trigger has mounted.
    expect(screen.getAllByRole('button', { name: /Alan/ })).toHaveLength(1)
  })

  test('opens from the keyboard with ArrowDown', async () => {
    renderMenu()

    fireEvent.keyDown(screen.getByRole('button', { name: /Alan/ }), {
      key: 'ArrowDown',
    })

    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })
})
