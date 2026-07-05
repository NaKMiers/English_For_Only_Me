import {
  getTextQualityFlags,
  normalizeSegmentComparisonText,
  normalizeSegmentText,
} from './text'
import type { EditableSegment } from './types'

function dedupeFlags(flags: EditableSegment['qualityFlags']) {
  return [...new Set(flags)]
}

function reorderSegments(segments: EditableSegment[]) {
  return segments
    .toSorted((left, right) => left.order - right.order)
    .map((segment, index) => ({
      ...segment,
      order: index,
    }))
}

export function editSegment(
  segment: EditableSegment,
  values: {
    endMs?: number | null
    startMs?: number | null
    text: string
  }
): EditableSegment {
  const text = normalizeSegmentText(values.text)
  const startMs =
    values.startMs === undefined ? segment.startMs : values.startMs
  const endMs = values.endMs === undefined ? segment.endMs : values.endMs
  const timingFlags =
    startMs === null && endMs === null
      ? (['untimed'] as const)
      : startMs === null || endMs === null
        ? (['partialTiming'] as const)
        : []

  return {
    ...segment,
    endMs,
    normalizedText: normalizeSegmentComparisonText(text),
    qualityFlags: dedupeFlags([...getTextQualityFlags(text), ...timingFlags]),
    startMs,
    text,
    warningAccepted: false,
  }
}

export function splitSegmentAt(
  segment: EditableSegment,
  splitAt: number
): [EditableSegment, EditableSegment] {
  const safeSplitAt = Math.min(Math.max(splitAt, 1), segment.text.length - 1)
  const leftText = normalizeSegmentText(segment.text.slice(0, safeSplitAt))
  const rightText = normalizeSegmentText(segment.text.slice(safeSplitAt))
  const startMs = segment.startMs
  const endMs = segment.endMs
  const hasTiming = startMs !== null && endMs !== null
  const duration = hasTiming ? endMs - startMs : null
  const ratio = safeSplitAt / segment.text.length
  const midpoint =
    hasTiming && duration !== null
      ? Math.round(startMs + duration * ratio)
      : null
  const left = editSegment(segment, {
    endMs: midpoint,
    startMs,
    text: leftText,
  })
  const right = editSegment(
    {
      ...segment,
      id: `${segment.id}:split`,
      order: segment.order + 1,
    },
    {
      endMs,
      startMs: midpoint,
      text: rightText,
    }
  )

  return [left, right]
}

export function mergeSegments(
  previousSegment: EditableSegment,
  nextSegment: EditableSegment
): EditableSegment {
  const text = normalizeSegmentText(
    `${previousSegment.text} ${nextSegment.text}`
  )
  const startMs =
    previousSegment.startMs !== null && nextSegment.startMs !== null
      ? Math.min(previousSegment.startMs, nextSegment.startMs)
      : previousSegment.startMs
  const endMs =
    previousSegment.endMs !== null && nextSegment.endMs !== null
      ? Math.max(previousSegment.endMs, nextSegment.endMs)
      : nextSegment.endMs

  return editSegment(
    {
      ...previousSegment,
      cueIndexes: [
        ...previousSegment.cueIndexes,
        ...nextSegment.cueIndexes,
      ].toSorted((left, right) => left - right),
    },
    {
      endMs,
      startMs,
      text,
    }
  )
}

export function applyLocalSegmentEdit(
  segments: EditableSegment[],
  segmentId: string,
  action:
    | {
        action: 'acceptWarning'
      }
    | {
        action: 'edit'
        endMs?: number | null
        startMs?: number | null
        text: string
      }
    | {
        action: 'mergeNext'
      }
    | {
        action: 'mergePrevious'
      }
    | {
        action: 'split'
        splitAt: number
      }
) {
  const orderedSegments = reorderSegments(segments)
  const segmentIndex = orderedSegments.findIndex(
    segment => segment.id === segmentId
  )

  if (segmentIndex < 0) return orderedSegments

  const segment = orderedSegments[segmentIndex]

  if (action.action === 'acceptWarning')
    return orderedSegments.map(item =>
      item.id === segmentId ? { ...item, warningAccepted: true } : item
    )

  if (action.action === 'edit')
    return orderedSegments.map(item =>
      item.id === segmentId ? editSegment(item, action) : item
    )

  if (action.action === 'split') {
    const [left, right] = splitSegmentAt(segment, action.splitAt)

    return reorderSegments([
      ...orderedSegments.slice(0, segmentIndex),
      left,
      right,
      ...orderedSegments.slice(segmentIndex + 1),
    ])
  }

  if (action.action === 'mergePrevious' && segmentIndex > 0) {
    const previousSegment = orderedSegments[segmentIndex - 1]
    const mergedSegment = mergeSegments(previousSegment, segment)

    return reorderSegments([
      ...orderedSegments.slice(0, segmentIndex - 1),
      mergedSegment,
      ...orderedSegments.slice(segmentIndex + 1),
    ])
  }

  if (
    action.action === 'mergeNext' &&
    segmentIndex < orderedSegments.length - 1
  ) {
    const nextSegment = orderedSegments[segmentIndex + 1]
    const mergedSegment = mergeSegments(segment, nextSegment)

    return reorderSegments([
      ...orderedSegments.slice(0, segmentIndex),
      mergedSegment,
      ...orderedSegments.slice(segmentIndex + 2),
    ])
  }

  return orderedSegments
}
