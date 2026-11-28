import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { DrawerHandle, DrawerRow } from './SideDrawer'

describe('DrawerRow', () => {
  test('keeps the side card folded until the handle slides it out', () => {
    render(
      <DrawerRow
        side={<p>Recent attempts</p>}
        sideId="test-side"
      >
        <DrawerHandle
          hideLabel="Hide recent"
          showLabel="Show recent"
        />
      </DrawerRow>
    )

    const handle = screen.getByRole('button', { name: 'Show recent' })
    const side = document.getElementById('test-side')

    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(handle).toHaveAttribute('aria-controls', 'test-side')
    expect(handle.className).not.toContain('bg-cta')
    expect(side).toHaveAttribute('inert')

    fireEvent.click(handle)

    const open = screen.getByRole('button', { name: 'Hide recent' })
    expect(open).toHaveAttribute('aria-expanded', 'true')
    // Open is the one strong control: cta, never bg-ink.
    expect(open.className).toContain('bg-cta text-cta-fg')
    expect(open.className).not.toContain('bg-ink')
    expect(side).not.toHaveAttribute('inert')
  })

  test('marks the row open so the journey card can go compact', () => {
    const { container } = render(
      <DrawerRow side={<p>Recent attempts</p>}>
        <DrawerHandle
          hideLabel="Hide recent"
          showLabel="Show recent"
        />
      </DrawerRow>
    )
    const row = container.firstElementChild

    expect(row?.className).toContain('group/drawer')
    expect(row).not.toHaveAttribute('data-drawer-open')
    fireEvent.click(screen.getByRole('button', { name: 'Show recent' }))
    expect(row).toHaveAttribute('data-drawer-open')
  })
})
