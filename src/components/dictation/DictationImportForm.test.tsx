import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type {
  DictationSegmentApiRecord,
  DictationTranscriptApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { setupDom } from '@/test/setupDom'

import { DictationImportForm } from './DictationImportForm'

setupDom()

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/components/dictation/DictationYoutubePlayer', () => ({
  DictationYoutubePlayer: ({ title }: { title: string }) => (
    <div aria-label="Segment video player">{title}</div>
  ),
}))

globalThis.HTMLElement.prototype.scrollIntoView = () => undefined

afterEach(() => {
  pushMock.mockReset()
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

function segmentRecord(
  overrides: Partial<DictationSegmentApiRecord> = {}
): DictationSegmentApiRecord {
  const now = new Date()

  return {
    attemptCount: 0,
    attemptStatus: 'notStarted',
    createdAt: now,
    cueIndexes: [0],
    endMs: 3000,
    id: 'segment-1',
    lastAttemptAt: null,
    normalizedText: 'your caption line',
    order: 0,
    qualityFlags: [],
    startMs: 1000,
    text: 'Your caption line.',
    transcriptId: 'transcript-1',
    transcriptSourceHash: 'hash-1',
    updatedAt: now,
    videoId,
    warningAccepted: false,
    ...overrides,
  }
}

function transcriptRecord(
  overrides: Partial<DictationTranscriptApiRecord> = {}
): DictationTranscriptApiRecord {
  const now = new Date()

  return {
    createdAt: now,
    createdBy: 'manual',
    cueCount: 1,
    id: 'transcript-1',
    isActive: true,
    language: 'en',
    qualityFlags: [],
    qualityStatus: 'ready',
    rawCues: [
      {
        endMs: 3000,
        index: 0,
        startMs: 1000,
        text: 'Your caption line.',
      },
    ],
    rawText: '1\n00:00:01,000 --> 00:00:03,000\nYour caption line.',
    segmentCount: 1,
    sourceHash: 'hash-1',
    sourceType: 'captionFile',
    updatedAt: now,
    videoId,
    ...overrides,
  }
}

function videoRecord(): DictationVideoApiRecord {
  return {
    activeTranscriptId: null,
    channelTitle: 'TED-Ed',
    collections: [],
    createdAt: new Date(),
    defaultLanguage: 'en-US',
    durationSeconds: 300,
    id: videoId,
    importStatus: 'metadataReady',
    importWarning: null,
    level: null,
    order: 0,
    purpose: 'ielts-listening',
    sectionId: null,
    sentenceCount: 0,
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    status: 'needsTranscript',
    tags: [],
    thumbnailUrl: null,
    topicId: null,
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
        return jsonResponse({
          alreadyExists: false,
          video: videoRecord(),
          warning: null,
        })

      return jsonResponse({ message: 'Unexpected request' }, 500)
    })

    const view = render(<DictationImportForm />)

    fireEvent.input(view.getByLabelText('YouTube URL'), {
      target: { value: 'https://www.youtube.com/watch?v=abc123abc12' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Save Video' }))

    await waitFor(() => {
      expect(view.getByText('Language captions')).not.toBeNull()
    })

    const savedVideo = view.getByTitle('A listening practice video')

    expect(savedVideo).toBeInstanceOf(window.HTMLIFrameElement)
    expect(savedVideo.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/abc123abc12'
    )

    // The unified caption manager, with English as the default dictation source.
    expect(view.getByRole('button', { name: 'Add Captions' })).not.toBeNull()
    expect(view.getByText('Needs captions')).not.toBeNull()
    expect(
      (view.getByLabelText('Or language code') as HTMLInputElement).value
    ).toBe('en')
    expect(view.queryByDisplayValue('en-US')).toBeNull()
  })

  test('moves to the edit page when the pasted YouTube video already exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input) === '/api/dictation/imports/youtube')
        return jsonResponse({
          alreadyExists: true,
          video: videoRecord(),
          warning: null,
        })

      return jsonResponse({ message: 'Unexpected request' }, 500)
    })

    const view = render(<DictationImportForm />)

    fireEvent.input(view.getByLabelText('YouTube URL'), {
      target: { value: 'https://www.youtube.com/watch?v=abc123abc12' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Save Video' }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/admin/videos/${videoId}/edit`)
    })

    expect(view.queryByText('Language captions')).toBeNull()
  })

  test('shows the full transcript preview for import videos after refresh', () => {
    const view = render(
      <DictationImportForm
        initialActiveTranscriptId="transcript-1"
        initialSegments={[segmentRecord()]}
        initialTracks={[transcriptRecord()]}
        initialTranslationTracks={[
          {
            language: 'vi',
            cues: [
              {
                endMs: 3000,
                startMs: 1000,
                text: 'Dong dich tieng Viet.',
              },
            ],
          },
        ]}
        initialVideo={{
          ...videoRecord(),
          activeTranscriptId: 'transcript-1',
          sentenceCount: 1,
          status: 'transcriptReady',
          transcriptStatus: 'manualAdded',
        }}
      />
    )

    expect(view.getByLabelText('Full transcript')).not.toBeNull()
    expect(view.getByText('Your caption line.')).not.toBeNull()
    expect(view.getAllByText('Dong dich tieng Viet.')).toHaveLength(1)
    expect(view.getByText('1 sentences')).not.toBeNull()
  })

  test('shows the full transcript preview for saved videos with segments', () => {
    const view = render(
      <DictationImportForm
        initialActiveTranscriptId="transcript-1"
        initialSegments={[
          segmentRecord(),
          segmentRecord({
            endMs: 6000,
            id: 'segment-2',
            normalizedText: 'another sentence',
            order: 1,
            startMs: 4000,
            text: 'Another sentence.',
          }),
        ]}
        initialTracks={[]}
        initialTranslationTracks={[
          {
            language: 'vi',
            cues: [
              {
                endMs: 3000,
                startMs: 1000,
                text: 'Dong dich tieng Viet.',
              },
            ],
          },
        ]}
        initialVideo={{
          ...videoRecord(),
          activeTranscriptId: 'transcript-1',
          sentenceCount: 2,
          status: 'transcriptReady',
          transcriptStatus: 'manualAdded',
        }}
        mode="edit"
      />
    )

    expect(view.getByLabelText('Full transcript')).not.toBeNull()
    expect(view.getByText('Your caption line.')).not.toBeNull()
    expect(view.getByText('Another sentence.')).not.toBeNull()
    expect(view.getByText('Translation')).not.toBeNull()
    expect(view.getAllByText('Dong dich tieng Viet.')).toHaveLength(1)
    expect(view.getByText('2 sentences')).not.toBeNull()
  })
})
