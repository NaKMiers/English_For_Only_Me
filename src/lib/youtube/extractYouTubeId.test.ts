import { describe, expect, test } from 'vitest'

import { extractYouTubeId } from './extractYouTubeId'

const VIDEO_ID = 'dQw4w9WgXcQ'

describe('extractYouTubeId', () => {
  test.each([
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com/watch?v=${VIDEO_ID}&list=study`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  ])('extracts %s', url => {
    expect(extractYouTubeId(url)).toEqual({
      ok: true,
      videoId: VIDEO_ID,
      normalizedUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    })
  })

  test.each([
    'not-a-url',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=too-short',
  ])('rejects %s', url => {
    expect(extractYouTubeId(url)).toMatchObject({
      ok: false,
    })
  })
})
