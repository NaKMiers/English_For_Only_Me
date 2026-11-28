import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { auth } from '@/lib/auth/auth'
import { loginUrlFor } from '@/lib/auth/callbackUrl'
import {
  assertOutboxOwnerMatchesUser,
  OUTBOX_OWNER_HEADER,
} from '@/lib/auth/clientOwnerKey'
import { assertOwnerKey } from '@/lib/auth/ownerKey'
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

/**
 * The signed-in user, or null without a session (only the login page renders
 * for that). Wrapped in React cache() so the JWT is decoded once per request
 * no matter how many layouts, pages and helpers ask for it.
 */
export const getOptionalUser = cache(readOptionalUser)

async function readOptionalUser(): Promise<CurrentUser | null> {
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

/** The client owner key an outbox write was queued for, when it says so. */
async function readOutboxOwnerHeader() {
  try {
    return (await headers()).get(OUTBOX_OWNER_HEADER)
  } catch {
    // Outside a request scope there is no outbox request to check.
    return null
  }
}

/**
 * The one identity seam for per-user data in route handlers and server
 * functions. Throws:
 * - UnauthenticatedError (401) without a session,
 * - InvalidOwnerKeyError (400) when the session's id is not an ObjectId (the
 *   data-isolation contract in ownerKey.ts: no ambiguous owner ever reaches a
 *   query or a write),
 * - OutboxOwnerMismatchError (409) when a queued write names another learner
 *   (a tab left open across a sign-out and a sign-in as someone else).
 * Callers scope every per-user query to the returned id, never a client one.
 */
export async function requireUser(): Promise<CurrentUser> {
  const [user, outboxOwner] = await Promise.all([
    getOptionalUser(),
    readOutboxOwnerHeader(),
  ])

  if (!user) throw new UnauthenticatedError()

  assertOwnerKey(user.id)
  assertOutboxOwnerMatchesUser(outboxOwner, user.id)

  return user
}

/**
 * requireUser for Server Components: without a session it redirects to the
 * login page instead of throwing, carrying `returnTo` (a same-origin path) as
 * the callback when given. The proxy already sends signed-out visitors there;
 * this is defense in depth for any path the matcher skips.
 */
export async function requirePageUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getOptionalUser()

  if (!user) redirect(loginUrlFor(returnTo ?? '/'))

  return user
}

/** Require an admin. Throws UnauthenticatedError (401) or ForbiddenError (403). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()

  if (user.role !== 'admin') throw new ForbiddenError()

  return user
}
