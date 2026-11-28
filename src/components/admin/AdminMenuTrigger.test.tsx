import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { DropdownMenu } from '@/components/ui/dropdown-menu'

import { AdminMenuTrigger } from './AdminMenuTrigger'

describe('AdminMenuTrigger', () => {
  test('a labelled menu button that pops and presses like an icon button', () => {
    render(
      <DropdownMenu>
        <AdminMenuTrigger label="Actions for Topic A" />
      </DropdownMenu>
    )

    const trigger = screen.getByRole('button', { name: 'Actions for Topic A' })
    expect(trigger.className).toMatch(/hover-pop/)
    expect(trigger.className).toMatch(/soft-press/)
  })
})
