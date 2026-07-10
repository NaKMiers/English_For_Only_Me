import 'server-only'

import { cookies } from 'next/headers'

/**
 * Guest identity for anonymous dictation practice. A guest gets a stable random
 * id persisted in an httpOnly cookie and used as the `userId` on their sessions,
 * attempts, review items, and debriefs - exactly like a signed-in user. On first
 * login the guest's rows are merged into the real account (see mergeGuestData).
 */
export const GUEST_COOKIE_NAME = 'dictationGuestId'

const GUEST_ID_PREFIX = 'guest_'
// One year - guests keep their progress across visits until they sign in.
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** True when an id belongs to a guest rather than a provisioned user. */
export function isGuestId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.startsWith(GUEST_ID_PREFIX)
}

function generateGuestId(): string {
  return `${GUEST_ID_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`
}

/**
 * Read the guest id from the incoming request cookie, or null when none is set.
 * Safe in Server Components (never writes a cookie).
 */
export async function getGuestId(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(GUEST_COOKIE_NAME)?.value

  return isGuestId(value) ? value : null
}

/**
 * Return the guest id, minting and persisting a fresh one on the outgoing
 * response when absent. Writes a cookie, so only call from Route Handlers or
 * Server Functions - never during Server Component render.
 */
export async function getOrCreateGuestId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(GUEST_COOKIE_NAME)?.value

  if (isGuestId(existing)) return existing

  const id = generateGuestId()

  store.set(GUEST_COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE,
  })

  return id
}

/** Drop the guest cookie once its data has been merged into a real account. */
export async function clearGuestCookie(): Promise<void> {
  const store = await cookies()

  store.delete(GUEST_COOKIE_NAME)
}
