import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import {
  DictationVideoThumbnail,
  getSafeThumbnailUrl,
} from './DictationVideoThumbnail'

describe('getSafeThumbnailUrl', () => {
  test('builds a 16:9 mqdefault URL from the video id', () => {
    expect(getSafeThumbnailUrl({ youtubeVideoId: 'dQw4w9WgXcQ' })).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    )
  })

  test('downsizes stored hqdefault URLs to mqdefault', () => {
    expect(
      getSafeThumbnailUrl({
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      })
    ).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg')
    expect(
      getSafeThumbnailUrl({
        thumbnailUrl: 'https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/hqdefault.webp',
      })
    ).toBe('https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/mqdefault.webp')
  })

  test('keeps other YouTube sizes and rejects foreign hosts', () => {
    expect(
      getSafeThumbnailUrl({
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      })
    ).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(
      getSafeThumbnailUrl({ thumbnailUrl: 'https://evil.example.com/a.jpg' })
    ).toBeNull()
  })
})

describe('DictationVideoThumbnail', () => {
  test('lazy-loads by default', () => {
    const html = renderToStaticMarkup(
      <DictationVideoThumbnail
        title="Lesson"
        youtubeVideoId="dQw4w9WgXcQ"
      />
    )

    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('fetchPriority="high"')
  })

  test('priority loads eagerly at high fetch priority', () => {
    const html = renderToStaticMarkup(
      <DictationVideoThumbnail
        title="Lesson"
        youtubeVideoId="dQw4w9WgXcQ"
        priority
      />
    )

    expect(html).toContain('loading="eager"')
    expect(html).toContain('fetchPriority="high"')
  })
})
