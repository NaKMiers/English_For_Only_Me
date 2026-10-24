import { describe, expect, it } from 'vitest'

import {
  buildInitialTranslationTrack,
  buildPracticeSegments,
} from './practicePageData'

const now = new Date('2026-10-24T00:00:00.000Z')

// A segment document as stored: shared content plus legacy progress fields a
// previous learner's attempts wrote onto it before the overlay existed.
const pollutedSegmentDoc = {
  _id: { toString: () => 'seg-1' },
  attemptCount: 5,
  attemptStatus: 'correct',
  createdAt: now,
  endMs: 2000,
  hints: ['Harvest'],
  hintsOverridden: false,
  lastAttemptAt: now,
  normalizedText: 'at harvest the mengs',
  order: 0,
  qualityFlags: ['tooShort'],
  startMs: 1000,
  text: 'At harvest, the Mengs.',
  transcriptId: { toString: () => 'transcript-1' },
  transcriptSourceHash: 'hash',
  translations: { fr: 'A la recolte.', vi: 'Vao mua gat.' },
  updatedAt: now,
  videoId: { toString: () => 'video-1' },
}

describe('buildPracticeSegments', () => {
  // CRITICAL REGRESSION: the loader must ignore the shared document's progress
  // and use only the learner's own overlay.
  it('shows a shared "correct" segment as not started for a learner with no attempts', () => {
    const [segment] = buildPracticeSegments([pollutedSegmentDoc], [])

    expect(segment.attemptStatus).toBe('notStarted')
    expect(segment.attemptCount).toBe(0)
    expect(segment.lastAttemptAt).toBeNull()
  })

  it('uses the learner rows when they have attempts', () => {
    const [segment] = buildPracticeSegments(
      [pollutedSegmentDoc],
      [
        {
          attemptCount: 1,
          attemptStatus: 'attemptedIncorrect',
          lastAttemptAt: now,
          segmentId: 'seg-1',
        },
      ]
    )

    expect(segment).toMatchObject({
      attemptCount: 1,
      attemptStatus: 'attemptedIncorrect',
    })
  })

  it('sends only the fields the practice shell uses', () => {
    const [segment] = buildPracticeSegments([pollutedSegmentDoc], [])

    expect(Object.keys(segment).sort()).toEqual(
      [
        'attemptCount',
        'attemptStatus',
        'endMs',
        'hints',
        'hintsOverridden',
        'id',
        'lastAttemptAt',
        'order',
        'startMs',
        'text',
        'transcriptId',
        'videoId',
      ].sort()
    )
    // Auto-derived hints are rebuilt in the browser; only overrides ship.
    expect(segment.hints).toEqual([])
  })

  it('keeps hints when the admin overrode them', () => {
    const [segment] = buildPracticeSegments(
      [{ ...pollutedSegmentDoc, hintsOverridden: true }],
      []
    )

    expect(segment.hints).toEqual(['Harvest'])
  })
})

describe('buildInitialTranslationTrack', () => {
  it('keeps only the opening language overrides', () => {
    const track = buildInitialTranslationTrack([pollutedSegmentDoc], {
      cues: [{ endMs: 2000, startMs: 1000, text: 'Bonjour' }],
      language: 'fr',
    })

    expect(track).toEqual({
      cues: [{ endMs: 2000, startMs: 1000, text: 'Bonjour' }],
      language: 'fr',
      overrides: { 'seg-1': 'A la recolte.' },
    })
  })

  it('is null without translation tracks', () => {
    expect(buildInitialTranslationTrack([pollutedSegmentDoc], null)).toBeNull()
  })
})
