import { describe, expect, test } from 'vitest'

import type { DictationVideoApiRecord } from './types'
import {
  getDictationResultsAction,
  hasDictationTranscript,
} from './videoReadiness'

function buildVideo(
  override: Partial<DictationVideoApiRecord> = {}
): DictationVideoApiRecord {
  return {
    activeTranscriptId: null,
    channelTitle: 'TED-Ed',
    collections: [],
    topicId: null,
    sectionId: null,
    level: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    defaultLanguage: 'en',
    durationSeconds: 300,
    id: '507f1f77bcf86cd799439011',
    importStatus: 'metadataReady',
    importWarning: null,
    order: 0,
    purpose: 'ielts-listening',
    sentenceCount: 0,
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    status: 'needsTranscript',
    tags: [],
    thumbnailUrl: null,
    title: 'A listening practice video',
    transcriptStatus: 'manualNeeded',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    youtubeUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    youtubeVideoId: 'abc123abc12',
    ...override,
  }
}

describe('dictation video readiness', () => {
  test('detects a usable transcript', () => {
    expect(hasDictationTranscript(buildVideo())).toBe(false)
    expect(
      hasDictationTranscript(
        buildVideo({
          activeTranscriptId: '507f1f77bcf86cd799439022',
          transcriptStatus: 'manualAdded',
        })
      )
    ).toBe(true)
  })

  test('labels results-page practice actions by per-user progress', () => {
    const videoId = '507f1f77bcf86cd799439011'
    const href = `/dictation/videos/${videoId}/practice`

    // notStarted -> Start Practice, regardless of whether stats exist.
    expect(
      getDictationResultsAction({ isEmpty: true, progress: 'notStarted', videoId })
    ).toEqual({ href, label: 'Start Practice' })
    expect(
      getDictationResultsAction({
        isEmpty: false,
        progress: 'notStarted',
        videoId,
      })
    ).toEqual({ href, label: 'Start Practice' })

    // inProgress -> Continue Practice, and it wins even with saved stats
    // (a completed-then-restarted video).
    expect(
      getDictationResultsAction({ isEmpty: true, progress: 'inProgress', videoId })
    ).toEqual({ href, label: 'Continue Practice' })
    expect(
      getDictationResultsAction({
        isEmpty: false,
        progress: 'inProgress',
        videoId,
      })
    ).toEqual({ href, label: 'Continue Practice' })

    // completed with results -> Practice Again; completed but no attempts
    // yet (persistence lag) -> Start Practice.
    expect(
      getDictationResultsAction({
        isEmpty: false,
        progress: 'completed',
        videoId,
      })
    ).toEqual({ href, label: 'Practice Again' })
    expect(
      getDictationResultsAction({ isEmpty: true, progress: 'completed', videoId })
    ).toEqual({ href, label: 'Start Practice' })
  })
})
