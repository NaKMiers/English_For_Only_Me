import { describe, expect, test } from 'vitest'

import { parseTranscriptRequest } from './transcriptRouteDecisions'

const videoId = '507f1f77bcf86cd799439011'

describe('parseTranscriptRequest', () => {
  test('rejects invalid video ids', () => {
    expect(
      parseTranscriptRequest({
        videoId: 'not-object-id',
        rawText: 'People often miss the final sound in listening tests.',
      })
    ).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  test('rejects empty transcript sources', () => {
    expect(
      parseTranscriptRequest({
        videoId,
        rawText: 'short',
      })
    ).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  test('accepts manual transcript text with normalized source data', () => {
    const result = parseTranscriptRequest({
      videoId,
      rawText:
        'People often miss the final sound. This transcript will become dictation practice later.',
    })

    expect(result).toMatchObject({
      ok: true,
      data: {
        videoId,
        normalized: {
          sourceType: 'manualText',
          qualityStatus: 'warning',
        },
      },
    })
  })

  test('accepts uploaded caption file text with timed cues', () => {
    const result = parseTranscriptRequest({
      videoId,
      sourceType: 'captionFile',
      rawText: `WEBVTT

00:00:01.000 --> 00:00:02.500
People often miss final sounds.

00:00:03.000 --> 00:00:05.250
That matters in IELTS listening.`,
    })

    expect(result).toMatchObject({
      ok: true,
      data: {
        videoId,
        normalized: {
          sourceType: 'captionFile',
          qualityStatus: 'ready',
          cueCount: 2,
        },
      },
    })
  })
})
