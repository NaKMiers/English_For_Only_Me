import { describe, expect, it } from 'vitest'

import { createDictationVideoPayloadSchema } from './videoPayloadSchema'

describe('createDictationVideoPayloadSchema', () => {
  it('accepts a minimal placeholder video payload', () => {
    const parsed = createDictationVideoPayloadSchema.safeParse({
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
    })

    expect(parsed.success).toBe(true)

    if (parsed.success)
      expect(parsed.data).toEqual({
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
        transcriptStatus: 'manualNeeded',
      })
  })

  it('trims optional title and youtubeUrl values', () => {
    const parsed = createDictationVideoPayloadSchema.safeParse({
      title: '  IELTS listening sample  ',
      youtubeUrl: '  https://youtu.be/abc123  ',
    })

    expect(parsed.success).toBe(true)

    if (parsed.success) expect(parsed.data.title).toBe('IELTS listening sample')

    if (parsed.success)
      expect(parsed.data.youtubeUrl).toBe('https://youtu.be/abc123')
  })

  it('rejects non-url values', () => {
    const parsed = createDictationVideoPayloadSchema.safeParse({
      youtubeUrl: 'not a url',
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects client ownerId fields', () => {
    const parsed = createDictationVideoPayloadSchema.safeParse({
      ownerId: 'client-controlled-owner',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
    })

    expect(parsed.success).toBe(false)
  })
})
