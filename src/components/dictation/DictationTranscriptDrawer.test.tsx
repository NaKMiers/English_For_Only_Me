import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { DictationSegmentApiRecord } from '@/modules/dictation/types'
import { setupDom } from '@/test/setupDom'

import { DictationTranscriptDrawer } from './DictationTranscriptDrawer'

setupDom()

function createSegment(
  overrides: Partial<DictationSegmentApiRecord> = {}
): DictationSegmentApiRecord {
  const now = new Date()

  return {
    attemptCount: 0,
    attemptStatus: 'notStarted',
    createdAt: now,
    cueIndexes: [],
    endMs: 2200,
    id: 'segment-one',
    lastAttemptAt: null,
    normalizedText: 'people often miss quiet words',
    order: 0,
    ownerId: 'owner-one',
    qualityFlags: [],
    startMs: 1000,
    text: 'People often miss quiet words.',
    transcriptId: 'transcript-one',
    transcriptSourceHash: 'hash-one',
    updatedAt: now,
    videoId: 'video-one',
    warningAccepted: false,
    ...overrides,
  }
}

describe('DictationTranscriptDrawer', () => {
  test('renders the current segment list when opened', async () => {
    const view = render(
      <DictationTranscriptDrawer
        currentSegmentId="segment-two"
        defaultOpen
        segments={[
          createSegment(),
          createSegment({
            id: 'segment-two',
            order: 1,
            startMs: null,
            endMs: null,
            text: 'Manual untimed sentences still appear here.',
          }),
        ]}
      />
    )

    expect(
      await view.findByText('People often miss quiet words.')
    ).not.toBeNull()
    expect(
      view.getByText('Manual untimed sentences still appear here.')
    ).not.toBeNull()
    expect(view.getByText('untimed')).not.toBeNull()
  })
})
