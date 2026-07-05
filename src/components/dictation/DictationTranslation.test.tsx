import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'

import { DictationTranslation } from './DictationTranslation'

setupDom()

vi.mock('@/requests/dictationTranslationsApi', () => ({
  getDictationTranslationApi: vi.fn(async () => ({
    mode: 'created',
    translation: {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'translation-one',
      ownerId: 'owner',
      provider: 'openai',
      segmentId: '507f1f77bcf86cd799439011',
      sourceHash: 'hash-one',
      status: 'ready',
      targetLanguage: 'vi',
      text: 'Hay tiep tuc luyen nghe.',
      unavailableReason: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })),
}))

describe('DictationTranslation', () => {
  test('stays hidden before segment completion', () => {
    const view = render(
      <DictationTranslation
        isUnlocked={false}
        segmentId="507f1f77bcf86cd799439011"
      />
    )

    expect(view.queryByText('Translation')).toBeNull()
  })

  test('requests and renders translation after completion unlocks it', async () => {
    const view = render(
      <DictationTranslation
        isUnlocked
        segmentId="507f1f77bcf86cd799439011"
      />
    )

    expect(view.getByText('Loading translation...')).not.toBeNull()

    await waitFor(() => {
      expect(view.getByText('Hay tiep tuc luyen nghe.')).not.toBeNull()
    })
  })

  test('does not import server-only translation secrets', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/dictation/DictationTranslation.tsx'),
      'utf8'
    )

    expect(source).not.toContain('translationProvider')
    expect(source).not.toContain('getOpenAiApiKey')
    expect(source).not.toContain('OPENAI_API_KEY')
    expect(source).not.toContain('server-only')
  })
})
