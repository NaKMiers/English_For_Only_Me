import { describe, expect, test } from 'vitest'

import {
  getSafeImageUrl,
  getTopicTileImageUrl,
  withCloudinaryTransform,
} from './topicThumbnailUrl'

const UPLOAD =
  'https://res.cloudinary.com/demo/image/upload/v1712345678/english-for-only-me/topic-thumbnails/abc.jpg'

describe('withCloudinaryTransform', () => {
  test('inserts the tile transform right after /image/upload/', () => {
    expect(withCloudinaryTransform(UPLOAD)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_160,h_160/v1712345678/english-for-only-me/topic-thumbnails/abc.jpg'
    )
  })

  test('is idempotent', () => {
    const once = withCloudinaryTransform(UPLOAD)

    expect(withCloudinaryTransform(once)).toBe(once)
  })

  test('leaves non-Cloudinary URLs untouched', () => {
    const url = 'https://images.example.com/image/upload/v1/abc.jpg'

    expect(withCloudinaryTransform(url)).toBe(url)
  })

  test('leaves Cloudinary URLs without an image upload path untouched', () => {
    const url = 'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4'

    expect(withCloudinaryTransform(url)).toBe(url)
  })

  test('returns unparseable input as-is', () => {
    expect(withCloudinaryTransform('not a url')).toBe('not a url')
  })
})

describe('getTopicTileImageUrl', () => {
  test('rejects non-https and empty URLs', () => {
    expect(getTopicTileImageUrl(null)).toBeNull()
    expect(getTopicTileImageUrl('')).toBeNull()
    expect(getTopicTileImageUrl('http://res.cloudinary.com/x.jpg')).toBeNull()
    expect(getSafeImageUrl('javascript:alert(1)')).toBeNull()
  })

  test('resizes Cloudinary uploads and passes other https URLs through', () => {
    expect(getTopicTileImageUrl(UPLOAD)).toContain(
      '/image/upload/f_auto,q_auto,c_fill,w_160,h_160/v1712345678/'
    )
    expect(getTopicTileImageUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png'
    )
  })
})
