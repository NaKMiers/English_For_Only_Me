import type { MetadataRoute } from 'next'

import { getSiteUrl, hasMongoDbUri } from '@/constants/environments'
import { getCachedTopics } from '@/modules/dictation/content/catalogReaders'

// Reflect newly created topics rather than freezing at build time. The topic
// list itself is cached under the dictation catalog tag.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base },
    { url: `${base}/dictation` },
  ]

  if (!hasMongoDbUri()) return staticEntries

  const topics = await getCachedTopics()

  return [
    ...staticEntries,
    ...topics.map(topic => ({
      url: `${base}/dictation/${topic.slug}`,
      lastModified: topic.updatedAt,
    })),
  ]
}
