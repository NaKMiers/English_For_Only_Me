import type { MetadataRoute } from 'next'

import { getSiteUrl, hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listTopics } from '@/modules/dictation/content/contentRepository'

// Reflect newly created topics rather than freezing at build time.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base },
    { url: `${base}/dictation` },
  ]

  if (!hasMongoDbUri()) return staticEntries

  await connectDatabase()

  const topics = await listTopics()

  return [
    ...staticEntries,
    ...topics.map(topic => ({
      url: `${base}/dictation/${topic.slug}`,
      lastModified: topic.updatedAt,
    })),
  ]
}
