import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  EMPTY_ACTIVITY,
  type AdminUserRow,
} from '@/modules/admin/users/userDirectory'

import { UserDirectory } from './UserDirectory'

const NOW = Date.parse('2026-11-28T12:00:00Z')

const USERS: AdminUserRow[] = [
  {
    id: 'a1',
    email: 'ann@example.com',
    name: 'Ann',
    image: null,
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: '2026-11-27T12:00:00Z',
    lockedAt: null,
    activity: { dictation: 3, grammar: 2, ielts: 1, vocabulary: 9 },
  },
  {
    id: 'b2',
    email: 'bob@example.com',
    name: null,
    image: null,
    role: 'user',
    status: 'locked',
    createdAt: '2026-05-01T00:00:00Z',
    lastLoginAt: null,
    lockedAt: '2026-11-01T00:00:00Z',
    activity: { ...EMPTY_ACTIVITY },
  },
]

describe('UserDirectory', () => {
  it('shows the summary and one linked row per user', () => {
    render(
      <UserDirectory
        now={NOW}
        users={USERS}
      />
    )

    expect(screen.getByText('2 users')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Open Ann' })).toHaveAttribute(
      'href',
      '/admin/users/a1'
    )

    const bob = screen.getByRole('link', { name: 'Open bob@example.com' })

    expect(within(bob).getByText('No name')).toBeVisible()
    expect(within(bob).getByText('Locked')).toBeVisible()
    expect(
      within(screen.getByRole('link', { name: 'Open Ann' })).getByText(
        'yesterday'
      )
    ).toBeVisible()
  })

  it('filters as you type and says when nothing matches', () => {
    render(
      <UserDirectory
        now={NOW}
        users={USERS}
      />
    )

    const search = screen.getByRole('searchbox', { name: 'Search users' })

    fireEvent.change(search, { target: { value: 'bob' } })
    expect(screen.getByText('1 user')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Open Ann' })).toBeNull()

    fireEvent.change(search, { target: { value: 'zed' } })
    expect(screen.getByText('No user matches "zed".')).toBeVisible()
  })

  it('says so when nobody has signed in yet', () => {
    render(
      <UserDirectory
        now={NOW}
        users={[]}
      />
    )

    expect(screen.getByText('Nobody has signed in yet.')).toBeVisible()
  })
})
