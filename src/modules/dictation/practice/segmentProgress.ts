import type { PipelineStage } from 'mongoose'

import type {
  DictationAttemptAction,
  DictationSegmentAttemptStatus,
} from '@/modules/dictation/types'

/**
 * Per-learner progress on one segment. DictationSegment is shared content, so
 * this is never read from (or written to) the segment document: it is derived
 * from the learner's own DictationAttempt rows and overlaid onto the segments
 * the practice page sends to the browser.
 */
export interface SegmentProgress {
  attemptCount: number
  attemptStatus: DictationSegmentAttemptStatus
  lastAttemptAt: Date | null
}

export interface SegmentProgressRow extends SegmentProgress {
  segmentId: string
}

/** One `$group` output document: the latest attempt per segment plus a count. */
export interface SegmentProgressGroup {
  _id: unknown
  action: DictationAttemptAction
  attemptCount: number
  isPassed: boolean
  lastAttemptAt: Date | null
}

export const EMPTY_SEGMENT_PROGRESS: SegmentProgress = {
  attemptCount: 0,
  attemptStatus: 'notStarted',
  lastAttemptAt: null,
}

/**
 * The aggregation over DictationAttempt that yields one group per attempted
 * segment. `$match` + `$sort` line up with the `{userId, videoId, createdAt:
 * -1}` index (or `{userId, segmentId, createdAt: -1}` for a single segment),
 * so `$first` is the latest attempt without an in-memory sort.
 */
export function buildSegmentProgressPipeline(
  match: Record<string, unknown>
): PipelineStage[] {
  return [
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$segmentId',
        action: { $first: '$action' },
        attemptCount: { $sum: 1 },
        isPassed: { $first: '$isPassed' },
        lastAttemptAt: { $first: '$createdAt' },
      },
    },
  ]
}

/**
 * Same verdict mapping the attempt route used to write onto the segment
 * (getAttemptSegmentStatus / getCheckSegmentStatus, pinned by a parity test).
 * Kept local so the browser bundle does not pull in the route's zod schema.
 */
export function getSegmentStatusForAttempt({
  action,
  isPassed,
}: {
  action: DictationAttemptAction
  isPassed: boolean
}): DictationSegmentAttemptStatus {
  if (action === 'reveal') return 'revealed'
  if (action === 'skip') return 'skipped'

  return isPassed ? 'correct' : 'attemptedIncorrect'
}

/** The progress a segment shows right after a locally graded attempt. */
export function applyAttemptToProgress(
  progress: SegmentProgress | undefined,
  attempt: {
    action: DictationAttemptAction
    createdAt: Date
    isPassed: boolean
  }
): SegmentProgress {
  return {
    attemptCount: (progress?.attemptCount ?? 0) + 1,
    attemptStatus: getSegmentStatusForAttempt(attempt),
    lastAttemptAt: attempt.createdAt,
  }
}

export function toSegmentProgressRow(
  group: SegmentProgressGroup
): SegmentProgressRow {
  return {
    attemptCount: group.attemptCount,
    attemptStatus: getSegmentStatusForAttempt({
      action: group.action,
      isPassed: Boolean(group.isPassed),
    }),
    lastAttemptAt: group.lastAttemptAt ?? null,
    segmentId: String(group._id),
  }
}

/**
 * Replace every segment's progress fields with the learner's own. Segments
 * without a row are reset to notStarted/0 - whatever progress fields the
 * shared document still carries (legacy writes from before the overlay) are
 * ignored, so one learner's verdicts never reach another learner.
 */
export function overlaySegmentProgress<T extends { id: string }>(
  segments: T[],
  rows: SegmentProgressRow[]
): Array<Omit<T, keyof SegmentProgress> & SegmentProgress> {
  const rowsBySegmentId = new Map(rows.map(row => [row.segmentId, row]))

  return segments.map(segment => {
    const row = rowsBySegmentId.get(segment.id)

    return {
      ...segment,
      attemptCount: row?.attemptCount ?? EMPTY_SEGMENT_PROGRESS.attemptCount,
      attemptStatus: row?.attemptStatus ?? EMPTY_SEGMENT_PROGRESS.attemptStatus,
      lastAttemptAt: row?.lastAttemptAt ?? EMPTY_SEGMENT_PROGRESS.lastAttemptAt,
    }
  })
}
