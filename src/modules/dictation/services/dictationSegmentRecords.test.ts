import { describe, expect, test } from 'vitest'

import { toDictationSegmentRecord } from './dictationSegmentRecords'

const base = {
  _id: 'seg-1',
  createdAt: new Date(),
  normalizedText: 'hello',
  order: 0,
  text: 'Hello.',
  transcriptId: 't-1',
  transcriptSourceHash: 'hash',
  updatedAt: new Date(),
  videoId: 'v-1',
}

describe('toDictationSegmentRecord - translations', () => {
  test('serializes a plain-object translations map (toObject/lean shape)', () => {
    const record = toDictationSegmentRecord({
      ...base,
      translations: { vi: 'Xin chào', fr: 'Bonjour' },
    })

    expect(record.translations).toEqual({ vi: 'Xin chào', fr: 'Bonjour' })
  })

  test('serializes a Mongoose Map translations field', () => {
    const record = toDictationSegmentRecord({
      ...base,
      translations: new Map([['vi', 'Xin chào']]),
    })

    expect(record.translations).toEqual({ vi: 'Xin chào' })
  })

  test('drops blank translation values', () => {
    const record = toDictationSegmentRecord({
      ...base,
      translations: { vi: '   ', fr: 'Bonjour' },
    })

    expect(record.translations).toEqual({ fr: 'Bonjour' })
  })

  test('defaults to an empty object when absent', () => {
    const record = toDictationSegmentRecord(base)

    expect(record.translations).toEqual({})
  })
})
