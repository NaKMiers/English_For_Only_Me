import { createHash, timingSafeEqual } from 'node:crypto'

import { z } from 'zod'

import { CACHE_TAG_LIST, type CacheTag } from './cacheTags'

export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret'

const revalidateBodySchema = z.object({
  tags: z.array(z.enum(CACHE_TAG_LIST)).min(1).max(CACHE_TAG_LIST.length),
})

/** Who is asking, as far as the session can tell. */
export type RevalidateViewer = 'admin' | 'anonymous' | 'user'

export type RevalidateDecision =
  | { ok: true; tags: CacheTag[] }
  | { ok: false; status: 400 | 401 | 403; message: string }

/**
 * Constant-time secret check. Both sides are hashed first so the comparison
 * runs over equal-length buffers and leaks neither the secret nor its length.
 * A missing configured secret disables the secret path entirely.
 */
export function isRevalidateSecretValid(
  provided: string | null,
  configured: string | null
) {
  if (!configured || !provided) return false

  const digest = (value: string) => createHash('sha256').update(value).digest()

  return timingSafeEqual(digest(provided), digest(configured))
}

/**
 * Pure decision for POST /api/admin/revalidate: authorize (admin session OR
 * the shared secret), then validate the body against the known tag list.
 * Authorization runs first so an unauthenticated caller learns nothing about
 * which tags exist.
 */
export function decideRevalidateRequest({
  body,
  configuredSecret,
  providedSecret,
  viewer,
}: {
  body: unknown
  configuredSecret: string | null
  providedSecret: string | null
  viewer: RevalidateViewer
}): RevalidateDecision {
  const hasSecret = isRevalidateSecretValid(providedSecret, configuredSecret)

  if (!hasSecret && viewer !== 'admin') {
    // A wrong secret is an authentication failure even for a signed-in user.
    if (viewer === 'user' && !providedSecret)
      return { ok: false, status: 403, message: 'Admin access required' }

    return { ok: false, status: 401, message: 'Authentication required' }
  }

  const parsed = revalidateBodySchema.safeParse(body)

  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      message: `Body must be { tags: [...] } using only: ${CACHE_TAG_LIST.join(', ')}`,
    }

  return { ok: true, tags: [...new Set(parsed.data.tags)] }
}
