import { afterEach, describe, expect, it } from 'vitest'

import { ENV_KEYS } from '@/constants/environments'

import { isAdminEmail, resolveRole } from './roles'

const original = process.env[ENV_KEYS.adminEmails]

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEYS.adminEmails]
  else process.env[ENV_KEYS.adminEmails] = original
})

describe('resolveRole', () => {
  it('returns user when no allowlist is configured', () => {
    delete process.env[ENV_KEYS.adminEmails]

    expect(resolveRole('anyone@example.com')).toBe('user')
  })

  it('grants admin to an allowlisted email, case-insensitively', () => {
    process.env[ENV_KEYS.adminEmails] = 'boss@example.com, other@example.com'

    expect(resolveRole('BOSS@example.com')).toBe('admin')
    expect(isAdminEmail('  boss@example.com ')).toBe(true)
  })

  it('returns user for a non-allowlisted email', () => {
    process.env[ENV_KEYS.adminEmails] = 'boss@example.com'

    expect(resolveRole('stranger@example.com')).toBe('user')
  })

  it('returns user for null/empty email', () => {
    process.env[ENV_KEYS.adminEmails] = 'boss@example.com'

    expect(resolveRole(null)).toBe('user')
    expect(resolveRole(undefined)).toBe('user')
    expect(resolveRole('')).toBe('user')
  })
})
