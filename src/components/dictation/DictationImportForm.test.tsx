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

describe('DictationImportForm', () => {
  test('loads selected caption file text into the transcript field', async () => {
    const view = render(<DictationImportForm />)
    const captionFile = new File(
      [
        `WEBVTT

00:00:01.000 --> 00:00:02.500
People often miss final sounds.`,
      ],
      'ielts-listening.vtt',
      { type: 'text/vtt' }
    )

    fireEvent.change(view.getByLabelText('Caption file'), {
      target: {
        files: [captionFile],
      },
    })

    await waitFor(() => {
      expect(view.getByText('ielts-listening.vtt')).not.toBeNull()
    })

    const transcriptInput = view.getByLabelText(
      'English transcript or VTT/SRT text'
    ) as HTMLTextAreaElement

    expect(transcriptInput.value).toContain('People often miss final sounds.')
    expect(transcriptInput.className).toContain('h-120')
    expect(transcriptInput.className).toContain('overflow-y-auto')
    expect(transcriptInput.className).toContain('field-sizing-fixed')
  })

  test('builds sentence segments after attaching a transcript', async () => {
    const videoId = '507f1f77bcf86cd799439011'
    const transcriptId = '507f1f77bcf86cd799439022'
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async input => {
        const url = String(input)

        if (url === '/api/dictation/imports/youtube')
          return jsonResponse({
            video: {
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
              ownerId: 'owner-one',
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
            },
            warning: null,
          })

        if (url === '/api/dictation/transcripts')
          return jsonResponse({
            transcript: {
              createdAt: new Date(),
              createdBy: 'manual',
              cueCount: 2,
              id: transcriptId,
              isActive: true,
              language: 'en',
              ownerId: 'owner-one',
              qualityFlags: ['captionFile', 'timed'],
              qualityStatus: 'ready',
              rawCues: [],
              rawText: 'People often miss final sounds.',
              segmentCount: 0,
              sourceHash: 'source-hash-one',
              sourceType: 'captionFile',
              updatedAt: new Date(),
              videoId,
            },
            videoId,
          })

        if (url === `/api/dictation/transcripts/${transcriptId}/segments`)
          return jsonResponse({
            qualityFlags: [],
            qualityStatus: 'ready',
            segments: [
              {
                attemptCount: 0,
                attemptStatus: 'notStarted',
                cueIndexes: [0],
                endMs: 2500,
                id: '507f1f77bcf86cd799439033',
                lastAttemptAt: null,
                normalizedText: 'people often miss final sounds',
                order: 0,
                ownerId: 'owner-one',
                qualityFlags: [],
                startMs: 1000,
                text: 'People often miss final sounds.',
                transcriptId,
                transcriptSourceHash: 'source-hash-one',
                videoId,
                warningAccepted: false,
              },
            ],
            transcriptId,
            videoId,
          })

        return jsonResponse({ message: 'Unexpected request' }, 500)
      })

    const view = render(<DictationImportForm />)

    fireEvent.change(view.getByLabelText('YouTube URL'), {
      target: {
        value: 'https://www.youtube.com/watch?v=abc123abc12',
      },
    })
    fireEvent.click(view.getByRole('button', { name: 'Save Video' }))

    await waitFor(() => {
      expect(
        view.getByText(
          'Video saved. Add transcript text to prepare it for segmenting.'
        )
      ).not.toBeNull()
    })

    fireEvent.change(
      view.getByLabelText('English transcript or VTT/SRT text'),
      {
        target: {
          value: `WEBVTT

00:00:01.000 --> 00:00:02.500
People often miss final sounds.`,
        },
      }
    )
    fireEvent.click(view.getByRole('button', { name: 'Attach Transcript' }))

    await waitFor(() => {
      expect(
        view.getByText(
          'Transcript saved and 1 sentence segments are ready for practice.'
        )
      ).not.toBeNull()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/dictation/transcripts/${transcriptId}/segments`,
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(
      view.getByRole('link', { name: 'Open Practice' }).getAttribute('href')
    ).toBe(`/dictation/videos/${videoId}/practice`)
  })
})
