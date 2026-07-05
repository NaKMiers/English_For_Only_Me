import { describe, expect, test } from 'vitest'

import {
  applyLocalSegmentEdit,
  mergeSegments,
  splitSegmentAt,
} from './editSegments'
import type { EditableSegment } from './types'

function createSegment(
  overrides: Partial<EditableSegment> = {}
): EditableSegment {
  return {
    cueIndexes: [overrides.order ?? 0],
    endMs: 2000,
    id: `segment-${overrides.order ?? 0}`,
    normalizedText: 'people listen carefully',
    order: 0,
    qualityFlags: [],
    startMs: 1000,
    text: 'People listen carefully.',
    warningAccepted: false,
    ...overrides,
  }
}

describe('segment edit helpers', () => {
  test('split preserves order and divides timestamps', () => {
    const [left, right] = splitSegmentAt(
      createSegment({
        text: 'People listen carefully.',
        startMs: 1000,
        endMs: 3000,
      }),
      14
    )

    expect(left.order).toBe(0)
    expect(right.order).toBe(1)
    expect(left.endMs).toBeGreaterThan(1000)
    expect(right.startMs).toBe(left.endMs)
    expect(right.endMs).toBe(3000)
  })

  test('merge preserves sentence order and outer timestamps', () => {
    const merged = mergeSegments(
      createSegment({
        cueIndexes: [0],
        order: 0,
        startMs: 1000,
        endMs: 2200,
        text: 'People listen carefully.',
      }),
      createSegment({
        cueIndexes: [1],
        order: 1,
        startMs: 2200,
        endMs: 4000,
        text: 'Then they repeat the sentence.',
      })
    )

    expect(merged).toMatchObject({
      cueIndexes: [0, 1],
      endMs: 4000,
      order: 0,
      startMs: 1000,
      text: 'People listen carefully. Then they repeat the sentence.',
    })
  })

  test('local split and merge keep continuous order', () => {
    const segments = [
      createSegment({ id: 'a', order: 0, text: 'First segment.' }),
      createSegment({ id: 'b', order: 1, text: 'Second segment.' }),
    ]
    const splitSegments = applyLocalSegmentEdit(segments, 'a', {
      action: 'split',
      splitAt: 6,
    })

    expect(splitSegments.map(segment => segment.order)).toEqual([0, 1, 2])

    const mergedSegments = applyLocalSegmentEdit(splitSegments, 'b', {
      action: 'mergePrevious',
    })

    expect(mergedSegments.map(segment => segment.order)).toEqual([0, 1])
  })
})
