import { describe, expect, test } from 'vitest'

import { getSafeImageUrl, getTopicTileImageUrl } from './topicThumbnailUrl'

const UPLOAD =
  'https://res.cloudinary.com/demo/image/upload/v1712345678/english-for-only-me/topic-thumbnails/abc.jpg'

describe('getTopicTileImageUrl', () => {
  test('rejects non-https and empty URLs', () => {
    expect(getTopicTileImageUrl(null)).toBeNull()
    expect(getTopicTileImageUrl('')).toBeNull()
    expect(getTopicTileImageUrl('http://res.cloudinary.com/x.jpg')).toBeNull()
    expect(getSafeImageUrl('javascript:alert(1)')).toBeNull()
  })

  // Strict Transformations rejects unsigned transform URLs with a 401, so the
  // upload must be served exactly as stored.
  test('serves Cloudinary uploads untransformed', () => {
    expect(getTopicTileImageUrl(UPLOAD)).toBe(UPLOAD)
    expect(getTopicTileImageUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png'
    )
  })
})
