import { describe, expect, it } from 'vitest'

import {
  ACTIVE_WINDOW_MS,
  deleteConfirmationMatches,
  EMPTY_ACTIVITY,
  filterAndSortUsers,
  isUserSort,
  managementBlock,
  summarizeUsers,
  type AdminUserRow,
} from './userDirectory'

const NOW = Date.parse('2026-11-28T12:00:00Z')

function row(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: 'u',
    email: 'u@example.com',
    name: null,
    image: null,
    role: 'user',
    status: 'active',
    createdAt: null,
    lastLoginAt: null,
    lockedAt: null,
    activity: { ...EMPTY_ACTIVITY },
    ...overrides,
  }
}

const ann = row({
  id: 'a',
  email: 'ann@example.com',
  name: 'Nguyễn Ann',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: '2026-11-27T00:00:00Z',
  activity: { dictation: 4, grammar: 1, ielts: 0, vocabulary: 2 },
})
const bob = row({
  id: 'b',
  email: 'bob@example.com',
  name: 'Bob',
  createdAt: '2026-06-01T00:00:00Z',
  lastLoginAt: '2026-10-01T00:00:00Z',
  status: 'locked',
  activity: { dictation: 20, grammar: 0, ielts: 3, vocabulary: 0 },
})
const cat = row({
  id: 'c',
  email: 'cat@example.com',
  role: 'admin',
  createdAt: '2026-09-01T00:00:00Z',
})

describe('filterAndSortUsers', () => {
  it('finds by name or email, ignoring case and accents', () => {
    const rows = [ann, bob, cat]

    expect(
      filterAndSortUsers(rows, { query: 'nguyen' }).map(r => r.id)
    ).toEqual(['a'])
    expect(filterAndSortUsers(rows, { query: 'BOB@' }).map(r => r.id)).toEqual([
      'b',
    ])
    expect(filterAndSortUsers(rows, { query: 'zzz' })).toEqual([])
  })

  it('sorts by last sign-in, newest, name and practice', () => {
    const rows = [cat, bob, ann]
    const ids = (sort: Parameters<typeof filterAndSortUsers>[1]['sort']) =>
      filterAndSortUsers(rows, { sort }).map(r => r.id)

    expect(ids('recent')).toEqual(['a', 'b', 'c'])
    expect(ids('newest')).toEqual(['c', 'b', 'a'])
    // No name sorts by email.
    expect(ids('name')).toEqual(['b', 'c', 'a'])
    expect(ids('active')).toEqual(['b', 'a', 'c'])
  })

  it('never reorders the caller array', () => {
    const rows = [cat, bob, ann]

    filterAndSortUsers(rows, { sort: 'name' })
    expect(rows.map(r => r.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('summarizeUsers', () => {
  it('counts total, active this week, locked and admins', () => {
    expect(summarizeUsers([ann, bob, cat], NOW)).toEqual({
      total: 3,
      activeThisWeek: 1,
      locked: 1,
      admins: 1,
    })
    expect(ACTIVE_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })
})

describe('managementBlock', () => {
  it('protects yourself and admins, allows everyone else', () => {
    expect(managementBlock(ann, 'a')).toBe('self')
    expect(managementBlock(cat, 'a')).toBe('admin')
    expect(managementBlock(bob, 'a')).toBeNull()
  })
})

describe('deleteConfirmationMatches', () => {
  it('needs the exact email, ignoring case and spaces around it', () => {
    expect(
      deleteConfirmationMatches('ann@example.com', ' Ann@Example.com ')
    ).toBe(true)
    expect(deleteConfirmationMatches('ann@example.com', 'ann@example')).toBe(
      false
    )
    expect(deleteConfirmationMatches('ann@example.com', '')).toBe(false)
  })
})

describe('isUserSort', () => {
  it('accepts only the known sorts', () => {
    expect(isUserSort('recent')).toBe(true)
    expect(isUserSort('email')).toBe(false)
  })
})
