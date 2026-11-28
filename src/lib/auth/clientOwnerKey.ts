import 'server-only'

import { createHash } from 'node:crypto'

import { OUTBOX_OWNER_HEADER } from '@/lib/sync/outbox'

export { OUTBOX_OWNER_HEADER }

/**
 * The owner key the browser sees: a one-way hash of the user id. It
 * namespaces localStorage per learner and lets the server check which learner
 * a queued write was for, without rendering the raw id into HTML. The format
 * stays as it is: queues already stored in browsers are keyed by it.
 */
export function toClientOwnerKey(id: string) {
  return createHash('sha256').update(id).digest('hex').slice(0, 24)
}

/**
 * Thrown when a queued write was made for a different learner than the one the
 * request is authenticated as (a tab left open across a sign-out and a sign-in
 * as someone else). 409 tells the outbox to settle the item as failed so the
 * UI rolls it back.
 */
export class OutboxOwnerMismatchError extends Error {
  readonly status = 409

  constructor() {
    super('This change was made for a different account. Reload the page.')
    this.name = 'OutboxOwnerMismatchError'
  }
}

/**
 * Whether the `x-outbox-owner` header agrees with the signed-in user. No header
 * means the request did not come from the outbox (server actions, plain
 * fetches), so there is nothing to check. Any value that was sent, even an
 * empty one (an outbox with no learner), must be this user's client key.
 */
export function outboxOwnerMatchesUser(
  headerValue: string | null | undefined,
  userId: string
) {
  if (headerValue === null || headerValue === undefined) return true

  return headerValue === toClientOwnerKey(userId)
}

export function assertOutboxOwnerMatchesUser(
  headerValue: string | null | undefined,
  userId: string
) {
  if (!outboxOwnerMatchesUser(headerValue, userId))
    throw new OutboxOwnerMismatchError()
}
