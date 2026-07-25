import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { DictationSegmentApiRecord } from '@/modules/dictation/types'
import { setupDom } from '@/test/setupDom'

import { DictationTranslationEditor } from './DictationTranslationEditor'

setupDom()

const setTranslationMock = vi.fn()
const translateMock = vi.fn()

vi.mock('@/requests/dictationTranslationsApi', () => ({
  setDictationSegmentTranslationApi: (input: {
    language: string
    segmentId: string
    text: string
  }) => setTranslationMock(input),
  translateDictationSegmentApi: (input: {
    language: string
    segmentId: string
  }) => translateMock(input),
}))

afterEach(() => {
  setTranslationMock.mockReset()
  translateMock.mockReset()
  cleanup()
  document.body.innerHTML = ''
})

function segment(
  overrides: Partial<DictationSegmentApiRecord> = {}
): DictationSegmentApiRecord {
  const now = new Date()

  return {
    attemptCount: 0,
    attemptStatus: 'notStarted',
    createdAt: now,
    cueIndexes: [],
    hints: [],
    hintsOverridden: false,
    endMs: 3000,
    id: 'seg-1',
    lastAttemptAt: null,
    normalizedText: 'hello world',
    order: 0,
    qualityFlags: [],
    startMs: 1000,
    text: 'Hello world.',
    transcriptId: 't-1',
    transcriptSourceHash: 'hash',
    translations: {},
    updatedAt: now,
    videoId: 'v-1',
    warningAccepted: false,
    ...overrides,
  }
}

const tracks = [
  {
    language: 'vi',
    cues: [{ startMs: 1000, endMs: 3000, text: 'Xin chào thế giới.' }],
  },
]

function renderEditor(seg: DictationSegmentApiRecord) {
  const onSegmentChange = vi.fn()
  const view = render(
    <DictationTranslationEditor
      onSegmentChange={onSegmentChange}
      segments={[seg]}
      translationTracks={tracks}
    />
  )

  return { onSegmentChange, view }
}

describe('DictationTranslationEditor', () => {
  test('defaults the field to the uploaded caption translation', () => {
    const { view } = renderEditor(segment())

    const field = view.getByLabelText(
      'Translation for sentence 1'
    ) as HTMLTextAreaElement

    expect(field.value).toBe('Xin chào thế giới.')
    expect(view.getByText('From captions')).toBeDefined()
  })

  test('editing enables Save and persists the override', async () => {
    setTranslationMock.mockResolvedValue({
      segment: segment({ translations: { vi: 'Bản dịch mới' } }),
    })
    const { onSegmentChange, view } = renderEditor(segment())

    const field = view.getByLabelText('Translation for sentence 1')

    fireEvent.change(field, { target: { value: 'Bản dịch mới' } })
    fireEvent.click(view.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(setTranslationMock).toHaveBeenCalledWith({
        language: 'vi',
        segmentId: 'seg-1',
        text: 'Bản dịch mới',
      })
    })
    await waitFor(() => {
      expect(onSegmentChange).toHaveBeenCalled()
    })
  })

  test('AI translate fills the field with the suggestion', async () => {
    translateMock.mockResolvedValue({ translation: 'Bản dịch AI' })
    const { view } = renderEditor(segment())

    fireEvent.click(view.getByRole('button', { name: 'AI translate' }))

    await waitFor(() => {
      expect(
        (
          view.getByLabelText(
            'Translation for sentence 1'
          ) as HTMLTextAreaElement
        ).value
      ).toBe('Bản dịch AI')
    })
    expect(translateMock).toHaveBeenCalledWith({
      language: 'vi',
      segmentId: 'seg-1',
    })
  })

  test('an overridden segment shows Reset to captions and clears on click', async () => {
    setTranslationMock.mockResolvedValue({
      segment: segment({ translations: {} }),
    })
    const { view } = renderEditor(
      segment({ translations: { vi: 'Bản dịch cũ' } })
    )

    // The Reset button only renders for an overridden segment.
    const resetButton = view.getByRole('button', { name: 'Reset to captions' })

    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(setTranslationMock).toHaveBeenCalledWith({
        language: 'vi',
        segmentId: 'seg-1',
        text: '',
      })
    })
  })
})
