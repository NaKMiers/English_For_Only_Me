import { describe, expect, test } from 'vitest'

import type { DictationTranslationApiRecord } from '@/modules/dictation/types'

import {
  findCachedTranslation,
  getTranslationCacheMode,
} from './translationCache'

const now = new Date('2026-01-01T00:00:00.000Z')

function makeTranslation(
  overrides: Partial<DictationTranslationApiRecord> = {}
): DictationTranslationApiRecord {
  return {
    createdAt: now,
    id: 'translation-one',
    ownerId: 'owner',
    provider: 'openai',
    segmentId: 'segment-one',
    sourceHash: 'hash-one',
    status: 'ready',
    targetLanguage: 'vi',
    text: 'Ban dang luyen nghe.',
    unavailableReason: null,
    updatedAt: now,
    ...overrides,
  }
}

describe('translation cache helpers', () => {
  test('finds cache entries by segment, language, and source hash', () => {
    const cachedTranslation = makeTranslation()

    expect(
      findCachedTranslation({
        segmentId: 'segment-one',
        sourceHash: 'hash-one',
        targetLanguage: 'vi',
        translations: [
          makeTranslation({
            id: 'wrong-source',
            sourceHash: 'hash-two',
          }),
          cachedTranslation,
        ],
      })
    ).toBe(cachedTranslation)
  })

  test('reports cache miss when the source hash changes', () => {
    const translation = findCachedTranslation({
      segmentId: 'segment-one',
      sourceHash: 'new-hash',
      targetLanguage: 'vi',
      translations: [makeTranslation()],
    })

    expect(translation).toBeNull()
    expect(getTranslationCacheMode(translation)).toBe('miss')
    expect(getTranslationCacheMode(makeTranslation())).toBe('hit')
  })
})
