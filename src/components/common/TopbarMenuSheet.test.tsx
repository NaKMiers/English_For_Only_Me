import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { TopbarMenuSheet } from './TopbarMenuSheet'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dictation',
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('TopbarMenuSheet', () => {
  test('is the account sheet: no module links (the tab bar has them)', () => {
    render(
      <TopbarMenuSheet
        authControl={<p>Signed in as Khoa</p>}
        onOpenChange={vi.fn()}
        open
      />
    )

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Signed in as Khoa')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Dictation/ })).toBeNull()
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
