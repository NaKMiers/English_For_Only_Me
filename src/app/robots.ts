import type { MetadataRoute } from 'next'

// Every page sits behind the Google sign-in, so nothing is crawlable.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
