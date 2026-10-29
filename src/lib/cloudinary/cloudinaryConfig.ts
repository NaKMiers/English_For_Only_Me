import 'server-only'

import { createHash } from 'node:crypto'

import { getCloudinaryUrl } from '@/constants/environments'

export interface CloudinaryConfig {
  apiKey: string
  apiSecret: string
  cloudName: string
}

export function parseCloudinaryUrl(rawUrl: string): CloudinaryConfig {
  const url = new URL(rawUrl)

  if (url.protocol !== 'cloudinary:')
    throw new Error('CLOUDINARY_URL must use the cloudinary:// protocol')

  return {
    apiKey: decodeURIComponent(url.username),
    apiSecret: decodeURIComponent(url.password),
    cloudName: url.hostname,
  }
}

export function getCloudinaryConfig(): CloudinaryConfig {
  return parseCloudinaryUrl(getCloudinaryUrl())
}

/** Cloudinary's upload signature: sorted `key=value` pairs plus the secret. */
export function createSignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}
