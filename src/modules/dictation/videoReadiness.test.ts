import { describe, expect, test } from 'vitest'

import type { DictationVideoApiRecord } from './types'
import {
  getDictationResultsAction,
  getDictationVideoAction,
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
    completedSessionCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    defaultLanguage: 'en',
    durationSeconds: 300,
    id: '507f1f77bcf86cd799439011',
    importStatus: 'metadataReady',
    importWarning: null,
    lastPracticedAt: null,
    ownerId: 'owner-one',
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
  test('routes missing-transcript videos to transcript editing', () => {
    const video = buildVideo()

    expect(hasDictationTranscript(video)).toBe(false)
    expect(getDictationVideoAction(video)).toEqual({
      href: '/admin/videos/507f1f77bcf86cd799439011/edit',
      label: 'Add Transcript',
    })
  })

  test('routes ready videos to practice start', () => {
    const video = buildVideo({
      activeTranscriptId: '507f1f77bcf86cd799439022',
      sentenceCount: 40,
      status: 'ready',
      transcriptStatus: 'manualAdded',
    })

    expect(hasDictationTranscript(video)).toBe(true)
    expect(getDictationVideoAction(video)).toEqual({
      href: '/dictation/videos/507f1f77bcf86cd799439011/practice',
      label: 'Start Practice',
    })
  })

  test('routes in-progress videos to practice continuation', () => {
    const video = buildVideo({
      activeTranscriptId: '507f1f77bcf86cd799439022',
      sentenceCount: 40,
      status: 'inProgress',
      transcriptStatus: 'manualAdded',
    })

    expect(getDictationVideoAction(video)).toEqual({
      href: '/dictation/videos/507f1f77bcf86cd799439011/practice',
      label: 'Continue Practice',
    })
  })

  test('routes completed videos to results', () => {
    const video = buildVideo({
      activeTranscriptId: '507f1f77bcf86cd799439022',
      completedSessionCount: 1,
      sentenceCount: 40,
      status: 'completed',
      transcriptStatus: 'manualAdded',
    })

    expect(getDictationVideoAction(video)).toEqual({
      href: '/dictation/videos/507f1f77bcf86cd799439011/results',
      label: 'Open Results',
    })
  })

  test('labels results-page practice actions by progress state', () => {
    expect(
      getDictationResultsAction({
        isEmpty: true,
        videoId: '507f1f77bcf86cd799439011',
        videoStatus: 'ready',
      })
    ).toEqual({
      href: '/dictation/videos/507f1f77bcf86cd799439011/practice',
      label: 'Start Practice',
    })

    expect(
      getDictationResultsAction({
        isEmpty: true,
        videoId: '507f1f77bcf86cd799439011',
        videoStatus: 'inProgress',
      })
    ).toEqual({
      href: '/dictation/videos/507f1f77bcf86cd799439011/practice',
      label: 'Continue Practice',
    })

    expect(
      getDictationResultsAction({
        isEmpty: false,
        videoId: '507f1f77bcf86cd799439011',
        videoStatus: 'completed',
      })
    ).toEqual({
      href: '/dictation/videos/507f1f77bcf86cd799439011/practice',
      label: 'Practice Again',
    })
  })
})
