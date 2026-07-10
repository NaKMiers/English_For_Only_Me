import { afterEach, describe, expect, it } from 'vitest'

import { ENV_KEYS } from '@/constants/environments'

import {
  getMissingMongoResponse,
  parseCreateVideoRequest,
} from '@/modules/dictation/services/videoRouteDecisions'

const originalEnv = {
  mongoDbUri: process.env[ENV_KEYS.mongoDbUri],
}

afterEach(() => {
  if (originalEnv.mongoDbUri === undefined)
    delete process.env[ENV_KEYS.mongoDbUri]
  else process.env[ENV_KEYS.mongoDbUri] = originalEnv.mongoDbUri
})

describe('/api/dictation/videos route decisions', () => {
  it('returns a clear missing MongoDB configuration decision', () => {
    delete process.env[ENV_KEYS.mongoDbUri]

    const decision = getMissingMongoResponse()

    expect(decision).toEqual({
      status: 500,
      body: {
        message:
          'MongoDB is not configured. Set MONGODB_URI on the server to use the dictation video library.',
      },
    })
  })

  it('does not expose the MongoDB URI when configuration exists', () => {
    process.env[ENV_KEYS.mongoDbUri] =
      'mongodb://secret-user:secret-pass@example.test/app'

    expect(getMissingMongoResponse()).toBeNull()
  })

  it('builds a create input from a valid payload', () => {
    const parsed = parseCreateVideoRequest({
      body: {
        title: '  City transport dictation  ',
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      },
    })

    expect(parsed).toEqual({
      ok: true,
      data: {
        title: 'City transport dictation',
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
        transcriptStatus: 'manualNeeded',
        status: 'needsTranscript',
      },
    })
  })

  it('defaults placeholder title when the payload has no title', () => {
    const parsed = parseCreateVideoRequest({
      body: {
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      },
    })

    expect(parsed).toMatchObject({
      ok: true,
      data: {
        title: 'Untitled dictation video',
      },
    })
  })

  it('rejects invalid payloads before database work', () => {
    const parsed = parseCreateVideoRequest({
      body: {
        youtubeUrl: 'not a url',
      },
    })

    expect(parsed).toMatchObject({
      ok: false,
      status: 400,
    })
  })
})
