import 'server-only'

import { auth } from '@/lib/auth/auth'
import type { UserRole } from '@/lib/auth/roles'

export interface CurrentUser {
  id: string
  email: string | null
  role: UserRole
  name: string | null
  image: string | null
}

export class UnauthenticatedError extends Error {
  readonly status = 401

  constructor() {
    super('Authentication required')
    this.name = 'UnauthenticatedError'
  }
}

export class ForbiddenError extends Error {
  readonly status = 403

  constructor() {
    super('Admin access required')
    this.name = 'ForbiddenError'
  }
}

/** The signed-in user, or null when anonymous (public browsing). */
export async function getOptionalUser(): Promise<CurrentUser | null> {
  const session = await auth()

  if (!session?.user?.id) return null

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: session.user.role,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  }
}

/**
 * R3 seam: require an authenticated user for per-user data. Throws
 * UnauthenticatedError (401) when anonymous. Callers scope every per-user query
 * to the returned id — never a client-supplied id.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getOptionalUser()

  if (!user) throw new UnauthenticatedError()

  return user
}

/** Require an admin. Throws UnauthenticatedError (401) or ForbiddenError (403). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()

  if (user.role !== 'admin') throw new ForbiddenError()

  return user
}
