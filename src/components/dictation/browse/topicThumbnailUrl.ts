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
 * The tile image URL: the stored upload as is. No Cloudinary delivery
 * transform (resize, f_auto): the account has Strict Transformations on, so
 * an unsigned transform URL answers 401 and the tile shows a broken image.
 */
export function getTopicTileImageUrl(url: string | null | undefined) {
  return getSafeImageUrl(url)
}
