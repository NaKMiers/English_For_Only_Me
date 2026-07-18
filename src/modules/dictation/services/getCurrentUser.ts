import 'server-only'

import { auth } from '@/lib/auth/auth'
import { getGuestId, getOrCreateGuestId } from '@/lib/auth/guestUser'
import { assertOwnerKey } from '@/lib/auth/ownerKey'
import type { UserRole } from '@/lib/auth/roles'

export interface CurrentUser {
  id: string
  email: string | null
  role: UserRole
  name: string | null
  image: string | null
}

/**
 * The actor that owns a piece of per-user practice data: either a signed-in
 * user or an anonymous guest. Practice does not require login (product rule);
 * guest data is scoped to a cookie-backed id and merged on first sign-in.
 */
export interface PracticeActor {
  id: string
  isGuest: boolean
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
 * to the returned id - never a client-supplied id.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getOptionalUser()

  if (!user) throw new UnauthenticatedError()

  return user
}

/**
 * Resolve the owner of per-user practice data: the signed-in user when present,
 * otherwise a guest identity. Mints the guest cookie when missing, so this may
 * only be called from Route Handlers or Server Functions (it writes a cookie).
 * Never throws - anonymous practice is always allowed.
 */
export async function requirePracticeActor(): Promise<PracticeActor> {
  const user = await getOptionalUser()

  // assertOwnerKey is the write-boundary guard: every per-user row created or
  // updated downstream is scoped to this id, so a null/empty/malformed owner
  // must never get this far (see ownerKey.ts - the data-isolation contract).
  if (user) return { id: assertOwnerKey(user.id), isGuest: false }

  return { id: assertOwnerKey(await getOrCreateGuestId()), isGuest: true }
}

/**
 * Read-only variant of requirePracticeActor for Server Components: returns the
 * user id, an existing guest id, or null when neither exists yet (a first-time
 * visitor who has not practiced). Never writes a cookie.
 */
export async function getPracticeActorId(): Promise<string | null> {
  const user = await getOptionalUser()

  if (user) return user.id

  return getGuestId()
}

/** Require an admin. Throws UnauthenticatedError (401) or ForbiddenError (403). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()

  if (user.role !== 'admin') throw new ForbiddenError()

  return user
}
