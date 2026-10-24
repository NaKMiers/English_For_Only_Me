import { getRevalidateSecret, getSiteUrl } from '@/constants/environments'
import type { CacheTag } from '@/lib/db/cacheTags'
import { REVALIDATE_SECRET_HEADER } from '@/lib/db/revalidateRequest'

/**
 * Ask the deployed site to expire shared-content cache tags after a script
 * wrote content behind its back. The Next data cache survives deploys, so
 * without this a seeded lesson can stay invisible until the time-based
 * safety net (see cacheTags.ts) runs out.
 *
 * Opt-in: does nothing unless REVALIDATE_SECRET is set, and never throws - a
 * failed ping costs freshness, not the write the script just made.
 */
export async function requestContentRevalidation(tags: CacheTag[]) {
  const secret = getRevalidateSecret()
  const url = `${getSiteUrl()}/api/admin/revalidate`

  if (!secret) {
    console.info(
      `[revalidate] REVALIDATE_SECRET unset - skipped. Expire ${tags.join(', ')} with \`bun run content:revalidate -- ${tags.join(' ')}\` or wait for the cache window.`
    )
    return false
  }

  try {
    const response = await fetch(url, {
      body: JSON.stringify({ tags }),
      headers: {
        'content-type': 'application/json',
        [REVALIDATE_SECRET_HEADER]: secret,
      },
      method: 'POST',
    })

    if (!response.ok) {
      console.warn(
        `[revalidate] ${url} answered ${response.status}: ${await response.text()}`
      )
      return false
    }

    console.info(`[revalidate] expired ${tags.join(', ')} on ${url}`)
    return true
  } catch (error) {
    console.warn(`[revalidate] could not reach ${url}`, error)
    return false
  }
}
