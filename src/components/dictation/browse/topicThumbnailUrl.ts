const CLOUDINARY_HOST = 'res.cloudinary.com'
const UPLOAD_SEGMENT = '/image/upload/'

/** 2x the largest tile (80px), cropped square, best format + quality. */
export const TOPIC_TILE_TRANSFORM = 'f_auto,q_auto,c_fill,w_160,h_160'

/**
 * Only https image URLs reach the tile; anything else falls back to the
 * initial letter.
 */
export function getSafeImageUrl(url: string | null | undefined) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null

    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Insert a Cloudinary delivery transform into a res.cloudinary.com upload URL
 * so a 64-80px tile downloads a small square instead of the original upload.
 * Non-Cloudinary URLs (and ones already carrying this transform) come back
 * untouched.
 */
export function withCloudinaryTransform(
  url: string,
  transform: string = TOPIC_TILE_TRANSFORM
) {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (parsed.hostname !== CLOUDINARY_HOST) return url

  const uploadIndex = parsed.pathname.indexOf(UPLOAD_SEGMENT)
  if (uploadIndex < 0) return url

  const head = parsed.pathname.slice(0, uploadIndex + UPLOAD_SEGMENT.length)
  const rest = parsed.pathname.slice(head.length)
  if (rest.startsWith(`${transform}/`)) return url

  parsed.pathname = `${head}${transform}/${rest}`

  return parsed.toString()
}

/** The tile image URL: safe https only, resized when it is on Cloudinary. */
export function getTopicTileImageUrl(url: string | null | undefined) {
  const safeUrl = getSafeImageUrl(url)

  return safeUrl ? withCloudinaryTransform(safeUrl) : null
}
