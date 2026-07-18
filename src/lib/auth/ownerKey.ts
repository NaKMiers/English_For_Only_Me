/**
 * The single owner identity for every per-user practice row (sessions,
 * attempts, review items, debriefs). It is exactly one of:
 * - a signed-in user's Mongo ObjectId, as a 24-char lowercase hex string, or
 * - an anonymous guest id: `guest_` + 32 hex chars (see guestUser.ts).
 *
 * It is NEVER null, empty, or any other shape. This is the data-isolation
 * contract: a row owned by an ambiguous key can leak across users, so we reject
 * such keys before they ever reach a query or a write.
 */
export const OWNER_KEY_PATTERN = /^([a-f0-9]{24}|guest_[a-f0-9]{32})$/

/** True when `value` is a well-formed owner key (real user or guest). */
export function isValidOwnerKey(value: unknown): value is string {
  return typeof value === 'string' && OWNER_KEY_PATTERN.test(value)
}

/** Thrown when a per-user operation is attempted without a valid owner. */
export class InvalidOwnerKeyError extends Error {
  readonly status = 400

  constructor(value: unknown) {
    super(`Invalid owner key: ${JSON.stringify(value)}`)
    this.name = 'InvalidOwnerKeyError'
  }
}

/**
 * Return `value` when it is a valid owner key, otherwise throw. Use at the write
 * boundary (and any read that must not silently match "nothing") so a null,
 * empty, or malformed owner can never be persisted or queried.
 */
export function assertOwnerKey(value: unknown): string {
  if (isValidOwnerKey(value)) return value

  throw new InvalidOwnerKeyError(value)
}
