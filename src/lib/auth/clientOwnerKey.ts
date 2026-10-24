import 'server-only'

import { createHash } from 'node:crypto'

import { ANONYMOUS_OUTBOX_OWNER, OUTBOX_OWNER_HEADER } from '@/lib/sync/outbox'

export { OUTBOX_OWNER_HEADER }

/**
 * The owner key the browser sees: a one-way hash of the user or guest id. The
 * raw guest id is a bearer credential (it lives in an httpOnly cookie), so it
 * must never be rendered into HTML. The hash still namespaces localStorage per
 * learner and lets the server check which learner a queued write was for.
 */
export function toClientOwnerKey(id: string) {
  return createHash('sha256').update(id).digest('hex').slice(0, 24)
}

/**
 * Thrown when a queued write was made for a different learner than the one the
 * request is authenticated as (a tab left open across a sign-in or sign-out).
 * 409 tells the outbox to settle the item as failed so the UI rolls it back.
 */
export class OutboxOwnerMismatchError extends Error {
  readonly status = 409

  constructor() {
    super('This change was made for a different account. Reload the page.')
    this.name = 'OutboxOwnerMismatchError'
  }
}

interface OwnerActor {
  id: string
  isGuest: boolean
}

/**
 * Whether the `x-outbox-owner` header agrees with the current actor. No header
 * means the request did not come from the outbox (server actions, older tabs),
 * so there is nothing to check. 'anonymous' was queued before the guest cookie
 * existed, so it only matches a guest.
 */
export function outboxOwnerMatchesActor(
  headerValue: string | null | undefined,
  actor: OwnerActor
) {
  if (!headerValue) return true

  if (headerValue === ANONYMOUS_OUTBOX_OWNER) return actor.isGuest

  return headerValue === toClientOwnerKey(actor.id)
}

export function assertOutboxOwnerMatchesActor(
  headerValue: string | null | undefined,
  actor: OwnerActor
) {
  if (!outboxOwnerMatchesActor(headerValue, actor))
    throw new OutboxOwnerMismatchError()
}
