// The first retry comes quickly (a blip), later ones back off to the cap so an
// offline tab does not hammer the server once it reconnects.
export const SESSION_START_RETRY_BASE_DELAY_MS = 500
export const SESSION_START_RETRY_MAX_DELAY_MS = 30_000

/**
 * Whether a failed session start is worth trying again: the request never
 * reached a server (fetch rejects with a TypeError), or the server failed in
 * a way that may pass (408 / 429 / 5xx, read from an error that carries a
 * `status`). Anything else, a 4xx refusal included, is final.
 */
export function isRetryableSessionStartError(error: unknown) {
  if (error instanceof TypeError) return true
  if (typeof error !== 'object' || error === null || !('status' in error))
    return false

  const { status } = error

  return (
    typeof status === 'number' &&
    (status === 0 || status === 408 || status === 429 || status >= 500)
  )
}

/** The wait before retry number `failures` (1 for the first retry). */
export function getSessionStartRetryDelayMs(failures: number) {
  return Math.min(
    SESSION_START_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, failures - 1),
    SESSION_START_RETRY_MAX_DELAY_MS
  )
}
