/**
 * Pure half of admin user management: the row shape the pages render, the
 * search / sort / summary over those rows, and who may be locked or deleted.
 * No database here, so all of it is unit-tested on its own.
 */

import type { UserRole } from '@/lib/auth/roles'

export type UserAccountStatus = 'active' | 'locked'

/** Practice counts per module, the same four the learner sees at home. */
export interface UserActivityCounts {
  dictation: number
  grammar: number
  ielts: number
  vocabulary: number
}

export interface AdminUserRow {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  status: UserAccountStatus
  /** ISO strings, so the rows cross the server/client boundary as is. */
  createdAt: string | null
  lastLoginAt: string | null
  lockedAt: string | null
  activity: UserActivityCounts
}

export const USER_SORTS = ['recent', 'newest', 'name', 'active'] as const

export type UserSort = (typeof USER_SORTS)[number]

export const EMPTY_ACTIVITY: UserActivityCounts = {
  dictation: 0,
  grammar: 0,
  ielts: 0,
  vocabulary: 0,
}

export function isUserSort(value: unknown): value is UserSort {
  return USER_SORTS.includes(value as UserSort)
}

export function totalActivity(activity: UserActivityCounts) {
  return (
    activity.dictation + activity.grammar + activity.ielts + activity.vocabulary
  )
}

function time(value: string | null) {
  return value ? Date.parse(value) || 0 : 0
}

/**
 * Rows matching `query` (name or email, case- and accent-insensitive), in the
 * chosen order:
 * - recent: last sign-in first (never signed in last)
 * - newest: newest account first
 * - name:   A to Z by name, falling back to the email
 * - active: most practice first
 */
export function filterAndSortUsers(
  rows: readonly AdminUserRow[],
  { query = '', sort = 'recent' }: { query?: string; sort?: UserSort }
): AdminUserRow[] {
  const needle = fold(query.trim())
  const matches = needle
    ? rows.filter(row =>
        fold(`${row.name ?? ''} ${row.email}`).includes(needle)
      )
    : [...rows]

  return matches.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return time(b.createdAt) - time(a.createdAt)
      case 'name':
        return (a.name || a.email).localeCompare(b.name || b.email)
      case 'active':
        return totalActivity(b.activity) - totalActivity(a.activity)
      default:
        return time(b.lastLoginAt) - time(a.lastLoginAt)
    }
  })
}

/** Lower-case without diacritics, so "nguyen" finds "Nguyễn". */
function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

export interface UserDirectorySummary {
  total: number
  /** Signed in within the last 7 days. */
  activeThisWeek: number
  locked: number
  admins: number
}

export const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function summarizeUsers(
  rows: readonly AdminUserRow[],
  now: number
): UserDirectorySummary {
  return {
    total: rows.length,
    activeThisWeek: rows.filter(
      row => row.lastLoginAt && now - time(row.lastLoginAt) <= ACTIVE_WINDOW_MS
    ).length,
    locked: rows.filter(row => row.status === 'locked').length,
    admins: rows.filter(row => row.role === 'admin').length,
  }
}

/**
 * Why an admin may not lock or delete this account, or null when they may:
 * never yourself (no locking yourself out), never an admin (admins come from
 * ADMIN_EMAILS; remove them there first).
 */
export type UserManagementBlock = 'self' | 'admin'

export function managementBlock(
  target: Pick<AdminUserRow, 'id' | 'role'>,
  actorId: string
): UserManagementBlock | null {
  if (target.id === actorId) return 'self'
  if (target.role === 'admin') return 'admin'

  return null
}

/** The delete dialog's guard: the typed email must match, ignoring case. */
export function deleteConfirmationMatches(email: string, typed: string) {
  return typed.trim().toLowerCase() === email.trim().toLowerCase()
}
