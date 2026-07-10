import { getAdminEmails } from '@/constants/environments'

export type UserRole = 'admin' | 'user'

/**
 * Role is derived from the ADMIN_EMAILS allowlist, never trusted from the
 * client. Email match is case-insensitive.
 */
export function resolveRole(email: string | null | undefined): UserRole {
  if (!email) return 'user'

  return getAdminEmails().has(email.trim().toLowerCase()) ? 'admin' : 'user'
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return resolveRole(email) === 'admin'
}
