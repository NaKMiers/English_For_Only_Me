import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'
import type { DictationTranscriptApiRecord } from '@/modules/dictation/types'
import { deleteDictationTranscriptApi } from '@/requests/dictationTranscriptsApi'

import { DictationCaptionManager } from './DictationCaptionManager'

setupDom()

vi.mock('@/requests/dictationTranscriptsApi', () => ({
  attachDictationTranscriptApi: vi.fn(),
  attachDictationTranslationTrackApi: vi.fn(),
  deleteDictationTranscriptApi: vi.fn(),
}))

vi.mock('@/requests/dictationSegmentsApi', () => ({
  buildDictationSegmentsApi: vi.fn(),
}))

const mockedDelete = vi.mocked(deleteDictationTranscriptApi)

function track(
  id: string,
  language: string,
  cueCount: number,
  segmentCount: number
): DictationTranscriptApiRecord {
  return {
    id,
    ownerId: 'owner',
    videoId: 'video-1',
    sourceType: 'captionFile',
    language,
    isActive: language === 'en',
    rawText: 'text',
    rawCues: [],
    sourceHash: `hash-${id}`,
    qualityStatus: 'ready',
    qualityFlags: [],
    cueCount,
    segmentCount,
    createdBy: 'manual',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

function renderManager(
  initialTracks: DictationTranscriptApiRecord[],
  activeId: string | null
) {
  return render(
    <DictationCaptionManager
      defaultLanguage="en"
      initialActiveTranscriptId={activeId}
      initialTracks={initialTracks}
      videoId="video-1"
    />
  )
}

beforeEach(() => {
  mockedDelete.mockReset()
  mockedDelete.mockResolvedValue({ deleted: true, transcriptId: 't-vi' })
})

describe('DictationCaptionManager', () => {
  test('shows the English source as ready and lists translation tracks', () => {
    const view = renderManager(
      [track('t-en', 'en', 30, 12), track('t-vi', 'vi', 28, 0)],
      't-en'
    )

    expect(view.getByText('Ready')).not.toBeNull()
    expect(view.getByText(/Dictation source — 12 sentences/)).not.toBeNull()
    expect(view.getByText('Vietnamese')).not.toBeNull()
    expect(view.getByText('28 timed cues')).not.toBeNull()
  })

  test('shows "needs captions" when there is no dictation source yet', () => {
    const view = renderManager([], null)

    expect(view.getByText('Needs captions')).not.toBeNull()
  })

  test('rejects an invalid language code', () => {
    const view = renderManager([], null)

    fireEvent.change(view.getByPlaceholderText('e.g. en, ja, pt-br'), {
      target: { value: '123' },
    })
    fireEvent.click(view.getByText('Add Captions'))

    expect(
      view.getByText('Choose or enter a valid language code first.')
    ).not.toBeNull()
  })

  test('asks for content when a valid language has no upload or paste', () => {
    const view = renderManager([], null)

    fireEvent.change(view.getByPlaceholderText('e.g. en, ja, pt-br'), {
      target: { value: 'ja' },
    })
    fireEvent.click(view.getByText('Add Captions'))

    expect(
      view.getByText('Upload a caption file or paste caption text first.')
    ).not.toBeNull()
  })

  test('accepts manually pasted caption text as the upload source', async () => {
    const { attachDictationTranslationTrackApi } = await import(
      '@/requests/dictationTranscriptsApi'
    )
    const mockedAttach = vi.mocked(attachDictationTranslationTrackApi)

    mockedAttach.mockResolvedValue({
      transcript: track('t-ja', 'ja', 3, 0),
      videoId: 'video-1',
    })

    const view = renderManager([], null)

    fireEvent.change(view.getByPlaceholderText('e.g. en, ja, pt-br'), {
      target: { value: 'ja' },
    })
    fireEvent.change(view.getByLabelText('Or paste / type captions'), {
      target: {
        value:
          '1\n00:00:01,000 --> 00:00:03,000\nKonnichiwa.',
      },
    })
    fireEvent.click(view.getByText('Add Captions'))

    await waitFor(() => {
      expect(mockedAttach).toHaveBeenCalledWith({
        videoId: 'video-1',
        language: 'ja',
        rawText: '1\n00:00:01,000 --> 00:00:03,000\nKonnichiwa.',
      })
    })
  })

  test('removes a translation track via the delete API', async () => {
    const view = renderManager(
      [track('t-en', 'en', 30, 12), track('t-vi', 'vi', 28, 0)],
      't-en'
    )

    fireEvent.click(view.getByLabelText('Remove Vietnamese captions'))

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('t-vi')
    })
    await waitFor(() => {
      expect(view.queryByText('28 timed cues')).toBeNull()
    })
  })
})
