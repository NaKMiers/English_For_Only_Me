import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { DictationSegmentApiRecord } from '@/modules/dictation/types'
import { setupDom } from '@/test/setupDom'

import { DictationHintEditor } from './DictationHintEditor'

setupDom()

const setHintsMock = vi.fn()
const resetHintsMock = vi.fn()

vi.mock('@/requests/dictationHintsApi', () => ({
  setDictationSegmentHintsApi: (input: {
    hints: string[]
    segmentId: string
  }) => setHintsMock(input),
  resetDictationSegmentHintsApi: (segmentId: string) =>
    resetHintsMock(segmentId),
}))

afterEach(() => {
  setHintsMock.mockReset()
  resetHintsMock.mockReset()
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
    id: 'seg-1',
    lastAttemptAt: null,
    normalizedText: 'they flew to london',
    order: 0,
    qualityFlags: [],
    startMs: null,
    endMs: null,
    text: 'They flew to London.',
    transcriptId: 'transcript-1',
    transcriptSourceHash: 'hash-1',
    updatedAt: now,
    videoId: 'video-1',
    warningAccepted: false,
    ...overrides,
  }
}

function renderEditor(seg: DictationSegmentApiRecord) {
  const onSegmentChange = vi.fn()
  const view = render(
    <DictationHintEditor
      onSegmentChange={onSegmentChange}
      segments={[seg]}
    />
  )

  return { onSegmentChange, view }
}

describe('DictationHintEditor', () => {
  test('seeds a non-overridden sentence with the automatic hints', () => {
    // "London" is an automatic proper-noun hint for this sentence.
    const { view } = renderEditor(segment())

    expect(view.getByText('London')).toBeDefined()
    expect(view.getByText('Auto')).toBeDefined()
  })

  test('adding a word appends it to the current list', async () => {
    setHintsMock.mockResolvedValue({
      segment: segment({ hints: ['London', 'flew'], hintsOverridden: true }),
    })
    const { onSegmentChange, view } = renderEditor(segment())

    fireEvent.change(view.getByLabelText('Add a hint to sentence 1'), {
      target: { value: 'flew' },
    })
    fireEvent.click(view.getByText('Add'))

    await waitFor(() => {
      expect(setHintsMock).toHaveBeenCalledWith({
        hints: ['London', 'flew'],
        segmentId: 'seg-1',
      })
    })
    await waitFor(() => {
      expect(onSegmentChange).toHaveBeenCalled()
    })
  })

  test('dragging a chip onto another reorders and saves the new order', async () => {
    setHintsMock.mockResolvedValue({
      segment: segment({ hints: ['London', 'They'], hintsOverridden: true }),
    })
    const { view } = renderEditor(
      segment({ hints: ['They', 'London'], hintsOverridden: true })
    )

    // Drag "London" (index 1) onto "They" (index 0).
    fireEvent.dragStart(view.getByText('London'))
    fireEvent.drop(view.getByText('They'))

    await waitFor(() => {
      expect(setHintsMock).toHaveBeenCalledWith({
        hints: ['London', 'They'],
        segmentId: 'seg-1',
      })
    })
  })

  test('rejects a word not in the sentence without calling the API', () => {
    const { view } = renderEditor(segment())

    fireEvent.change(view.getByLabelText('Add a hint to sentence 1'), {
      target: { value: 'Berlin' },
    })
    fireEvent.click(view.getByText('Add'))

    expect(view.getByText('That word is not in this sentence.')).toBeDefined()
    expect(setHintsMock).not.toHaveBeenCalled()
  })

  test('removing a hint saves the shortened list', async () => {
    setHintsMock.mockResolvedValue({
      segment: segment({ hints: [], hintsOverridden: true }),
    })
    const { view } = renderEditor(
      segment({ hints: ['London'], hintsOverridden: true })
    )

    fireEvent.click(view.getByLabelText('Remove hint London'))

    await waitFor(() => {
      expect(setHintsMock).toHaveBeenCalledWith({
        hints: [],
        segmentId: 'seg-1',
      })
    })
  })

  test('an overridden sentence shows Reset to auto and calls the reset API', async () => {
    resetHintsMock.mockResolvedValue({
      segment: segment({ hints: [], hintsOverridden: false }),
    })
    const { view } = renderEditor(
      segment({ hints: ['London'], hintsOverridden: true })
    )

    expect(view.getByText('Custom')).toBeDefined()
    fireEvent.click(view.getByText('Reset to auto'))

    await waitFor(() => {
      expect(resetHintsMock).toHaveBeenCalledWith('seg-1')
    })
  })

  test('paginates 5 sentences per page', () => {
    const many = Array.from({ length: 7 }, (_value, index) =>
      segment({
        id: `seg-${index}`,
        order: index,
        text: `Sentence number ${index} here.`,
      })
    )
    const view = render(
      <DictationHintEditor
        onSegmentChange={vi.fn()}
        segments={many}
      />
    )

    // Page 1: first 5 sentences only.
    expect(view.getByText('Sentence number 0 here.')).toBeDefined()
    expect(view.getByText('Sentence number 4 here.')).toBeDefined()
    expect(view.queryByText('Sentence number 5 here.')).toBeNull()
    // Pager renders at the top and bottom of the list.
    expect(view.getAllByText('Sentences 1-5 of 7').length).toBe(2)

    // Next page: the remaining 2 sentences.
    fireEvent.click(view.getAllByText('Next')[0])

    expect(view.queryByText('Sentence number 4 here.')).toBeNull()
    expect(view.getByText('Sentence number 5 here.')).toBeDefined()
    expect(view.getByText('Sentence number 6 here.')).toBeDefined()
    expect(view.getAllByText('Sentences 6-7 of 7').length).toBe(2)
  })

  test('shows no pager for five or fewer sentences', () => {
    const view = render(
      <DictationHintEditor
        onSegmentChange={vi.fn()}
        segments={[segment()]}
      />
    )

    expect(view.queryByText('Next')).toBeNull()
  })
})
