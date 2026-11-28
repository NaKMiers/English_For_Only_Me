import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserModel } from '@/models/UserModel'

import { isValidOwnerKey } from './ownerKey'

/**
 * Whether a signed-in account may still use the app. Sessions are JWTs, so an
 * admin's lock (or a delete) cannot revoke a cookie that was already issued;
 * instead every identity read (`getOptionalUser`) asks here and treats a
 * blocked account as signed out.
 *
 *   identity read ──► memory cache (60 s per user id) ──hit──► answer
 *                          │ miss
 *                          ▼
 *                     User.findById ──► locked or missing = blocked
 *
 * The cache keeps this to one small indexed read per learner per minute per
 * server instance. The admin actions clear the entry on the instance that
 * served them, so a lock bites at once there and within a minute elsewhere.
 */
export const ACCOUNT_STATUS_TTL_MS = 60_000

const MAX_ENTRIES = 5000

/**
 * Why a session's account may not be used: an admin `locked` it, or it was
 * `deleted` (its session outlived it). Null when it may.
 */
export type AccountBlock = 'deleted' | 'locked' | null

const statusCache = new Map<string, { at: number; block: AccountBlock }>()

function remember(userId: string, block: AccountBlock, now: number) {
  if (statusCache.size >= MAX_ENTRIES) statusCache.clear()
  statusCache.set(userId, { at: now, block })
}

/**
 * Whether the account is locked, deleted or fine. Fails open on a database
 * error (logged): an outage must not sign every learner out, and the page
 * that follows needs the database anyway.
 */
export async function getAccountBlock(
  userId: string,
  now = Date.now()
): Promise<AccountBlock> {
  // No database configured: nothing to look up. A malformed id is left to
  // assertOwnerKey (400) rather than turned into a cast error here.
  if (!hasMongoDbUri() || !isValidOwnerKey(userId)) return null

  const hit = statusCache.get(userId)

  if (hit && now - hit.at < ACCOUNT_STATUS_TTL_MS) return hit.block

  try {
    await connectDatabase()

    const user = await UserModel.findById(userId, { status: 1 }).lean()
    const block: AccountBlock = !user
      ? 'deleted'
      : user.status === 'locked'
        ? 'locked'
        : null

    remember(userId, block, now)

    return block
  } catch (error) {
    console.error('[accountStatus] lookup failed; allowing the session', error)

    return null
  }
}

/** True when the account is locked or no longer exists. */
export async function isAccountBlocked(userId: string, now = Date.now()) {
  return (await getAccountBlock(userId, now)) !== null
}

/** Is the account behind this email locked? Used when Google signs it in. */
export async function isEmailLocked(email: string): Promise<boolean> {
  if (!hasMongoDbUri()) return false

  await connectDatabase()

  const user = await UserModel.findOne(
    { email: email.trim().toLowerCase() },
    { status: 1 }
  ).lean()

  return user?.status === 'locked'
}

/** Drop the cached answer after an admin locks, unlocks or deletes a user. */
export function forgetAccountStatus(userId: string) {
  statusCache.delete(userId)
}

/** Test seam: start every test with an empty cache. */
export function clearAccountStatusCache() {
  statusCache.clear()
}
