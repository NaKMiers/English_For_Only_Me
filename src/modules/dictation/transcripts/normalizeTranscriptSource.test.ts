import { describe, expect, test } from 'vitest'

import { createTranscriptSourceHash } from './sourceHash'
import { normalizeTranscriptSource } from './normalizeTranscriptSource'

describe('normalizeTranscriptSource', () => {
  test('normalizes manual transcript text with an untimed warning', () => {
    const result = normalizeTranscriptSource({
      rawText:
        '  People often miss the final sound.  This is useful IELTS listening practice. ',
    })

    expect(result).toMatchObject({
      sourceType: 'manualText',
      qualityStatus: 'warning',
      cueCount: 0,
    })
    expect(result.qualityFlags).toContain('untimed')
    expect(result.normalizedText).toBe(
      'People often miss the final sound. This is useful IELTS listening practice.'
    )
  })

  test('parses pasted VTT cues', () => {
    const result = normalizeTranscriptSource({
      rawText: `WEBVTT

00:00:01.000 --> 00:00:02.500
<v Speaker>People often miss final sounds.

00:00:03.000 --> 00:00:05.250
That matters in IELTS listening.`,
    })

    expect(result.sourceType).toBe('captionFile')
    expect(result.qualityStatus).toBe('ready')
    expect(result.cueCount).toBe(2)
    expect(result.rawCues[0]).toEqual({
      index: 0,
      text: 'People often miss final sounds.',
      startMs: 1000,
      endMs: 2500,
    })
    expect(result.qualityFlags).toContain('htmlStripped')
  })

  test('parses pasted SRT cues', () => {
    const result = normalizeTranscriptSource({
      rawText: `1
00:00:01,000 --> 00:00:02,000
First line.

2
00:00:02,500 --> 00:00:04,000
Second line.`,
    })

    expect(result.sourceType).toBe('captionFile')
    expect(result.rawCues).toHaveLength(2)
    expect(result.rawCues[1]?.startMs).toBe(2500)
  })

  test('returns stable hashes for equivalent normalized sources', () => {
    const hashA = createTranscriptSourceHash({
      sourceType: 'manualText',
      language: 'EN',
      normalizedText: 'A stable transcript.',
    })
    const hashB = createTranscriptSourceHash({
      sourceType: 'manualText',
      language: 'en',
      normalizedText: 'A stable transcript.',
    })

    expect(hashA).toBe(hashB)
  })
})
