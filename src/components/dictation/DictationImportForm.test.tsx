import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'

import { DictationImportForm } from './DictationImportForm'

setupDom()

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
  document.body.innerHTML = ''
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  })
}

const videoId = '507f1f77bcf86cd799439011'

function videoRecord() {
  return {
    activeTranscriptId: null,
    channelTitle: 'TED-Ed',
    collections: [],
    completedSessionCount: 0,
    createdAt: new Date(),
    defaultLanguage: 'en',
    durationSeconds: 300,
    id: videoId,
    importStatus: 'metadataReady',
    importWarning: null,
    lastPracticedAt: null,
    purpose: 'ielts-listening',
    sentenceCount: 0,
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    status: 'needsTranscript',
    tags: [],
    thumbnailUrl: null,
    title: 'A listening practice video',
    transcriptStatus: 'manualNeeded',
    updatedAt: new Date(),
    youtubeUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    youtubeVideoId: 'abc123abc12',
  }
}

describe('DictationImportForm', () => {
  test('prompts to save a video before captions can be added', () => {
    const view = render(<DictationImportForm />)

    expect(
      view.getByText('Save a YouTube URL first, then upload captions.')
    ).not.toBeNull()
    expect(view.queryByText('Language captions')).toBeNull()
  })

  test('reveals the caption manager after a video is saved', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input) === '/api/dictation/imports/youtube')
        return jsonResponse({ video: videoRecord(), warning: null })

      return jsonResponse({ message: 'Unexpected request' }, 500)
    })

    const view = render(<DictationImportForm />)

    fireEvent.change(view.getByLabelText('YouTube URL'), {
      target: { value: 'https://www.youtube.com/watch?v=abc123abc12' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Save Video' }))

    await waitFor(() => {
      expect(view.getByText('Language captions')).not.toBeNull()
    })

    // The unified caption manager, with English as the default dictation source.
    expect(view.getByRole('button', { name: 'Add Captions' })).not.toBeNull()
    expect(view.getByText('Needs captions')).not.toBeNull()
  })
})
