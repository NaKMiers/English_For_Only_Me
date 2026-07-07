import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'
import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

import { DictationFullTranscript } from './DictationFullTranscript'

setupDom()

globalThis.HTMLElement.prototype.scrollIntoView = () => undefined

function makeSegment(
  overrides: Partial<DictationSegmentApiRecord> & { id: string; order: number }
): DictationSegmentApiRecord {
  return {
    attemptCount: 0,
    attemptStatus: 'notStarted',
    createdAt: new Date(),
    cueIndexes: [],
    endMs: (overrides.order + 1) * 1000,
    lastAttemptAt: null,
    normalizedText: '',
    ownerId: 'owner-1',
    qualityFlags: [],
    startMs: overrides.order * 1000,
    text: `Sentence ${overrides.order + 1}`,
    transcriptId: 'transcript-1',
    transcriptSourceHash: 'hash',
    updatedAt: new Date(),
    videoId: 'video-1',
    warningAccepted: false,
    ...overrides,
  }
}

const SEGMENTS = [
  makeSegment({ id: 'seg-1', order: 0 }),
  makeSegment({ id: 'seg-2', order: 1 }),
  makeSegment({ id: 'seg-3', order: 2 }),
]

describe('DictationFullTranscript', () => {
  test('calls onSelectSegment with the clicked segment', () => {
    const onSelectSegment = vi.fn()
    const view = render(
      <DictationFullTranscript
        currentSegmentId="seg-1"
        isActive
        onSelectSegment={onSelectSegment}
        playingSegmentId={null}
        segments={SEGMENTS}
      />
    )

    fireEvent.click(view.getByText('Sentence 2'))

    expect(onSelectSegment).toHaveBeenCalledTimes(1)
    expect(onSelectSegment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'seg-2', startMs: 1000 })
    )
  })

  test('highlights the playing segment over the practice cursor', () => {
    const view = render(
      <DictationFullTranscript
        currentSegmentId="seg-1"
        isActive
        onSelectSegment={vi.fn()}
        playingSegmentId="seg-3"
        segments={SEGMENTS}
      />
    )

    const playingRow = view.getByText('Sentence 3').closest('button')
    const cursorRow = view.getByText('Sentence 1').closest('button')

    expect(playingRow?.getAttribute('aria-current')).toBe('true')
    expect(cursorRow?.getAttribute('aria-current')).toBeNull()
  })
})
