import { CACHE_TAG_LIST, type CacheTag } from '@/lib/db/cacheTags'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/**
 * Expire shared-content cache tags on the deployed site (SITE_URL). Needs
 * REVALIDATE_SECRET to match the one configured on the deployment.
 *
 *   bun run content:revalidate                      # every tag
 *   bun run content:revalidate -- grammar-content   # just one
 */
async function main() {
  const requested = process.argv.slice(2).filter(arg => !arg.startsWith('-'))
  const unknown = requested.filter(
    tag => !CACHE_TAG_LIST.includes(tag as CacheTag)
  )

  if (unknown.length) {
    console.error(
      `Unknown tag(s): ${unknown.join(', ')}. Known: ${CACHE_TAG_LIST.join(', ')}`
    )
    process.exit(1)
  }

  const tags = requested.length ? (requested as CacheTag[]) : CACHE_TAG_LIST

  if (!(await requestContentRevalidation(tags))) process.exit(1)
}

main().catch(error => {
  console.error('Failed to revalidate content', error)
  process.exit(1)
})
