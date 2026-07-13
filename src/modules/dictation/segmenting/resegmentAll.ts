import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import {
  persistRebuiltSegments,
  toCueRecords,
} from '@/modules/dictation/services/rebuildTranscriptSegments'

import { buildDictationSegments } from './buildSegments'

export interface ResegmentAllResult {
  scanned: number
  resegmented: number
  skippedEmpty: number
  skippedNoVideo: number
  skippedNotActive: number
  prunedReviewItems: number
  oldSegmentTotal: number
  newSegmentTotal: number
}

/**
 * Re-run segmentation for every video's ACTIVE primary transcript so existing
 * videos pick up the current (pause-based) segment logic.
 *
 * Only active primary transcripts are processed (isActive: true and matching
 * the video's activeTranscriptId). Translation caption tracks and superseded
 * transcripts (isActive: false) never get segments - that mirrors what the
 * app does, and matches the video count in admin (one active transcript per
 * video), not the raw transcript count.
 *
 * Dry-run by default: only reports old-vs-new segment counts. With
 * `dryRun: false` it rebuilds via the shared {@link persistRebuiltSegments}
 * (destructive rebuild + prune of orphaned review items). Idempotent.
 */
export async function resegmentAllTranscripts({
  dryRun,
}: {
  dryRun: boolean
}): Promise<ResegmentAllResult> {
  const transcripts = await DictationTranscriptModel.find({ isActive: true })

  const result: ResegmentAllResult = {
    scanned: 0,
    resegmented: 0,
    skippedEmpty: 0,
    skippedNoVideo: 0,
    skippedNotActive: 0,
    prunedReviewItems: 0,
    oldSegmentTotal: 0,
    newSegmentTotal: 0,
  }

  for (const transcript of transcripts) {
    result.scanned += 1

    const video = await DictationVideoModel.findOne({ _id: transcript.videoId })

    if (!video) {
      result.skippedNoVideo += 1
      continue
    }

    // Defensive: only the transcript the video actually points at is the one
    // practice reads, so never re-segment a stray isActive record.
    if (String(video.activeTranscriptId) !== String(transcript._id)) {
      result.skippedNotActive += 1
      continue
    }

    result.oldSegmentTotal += transcript.segmentCount ?? 0

    const built = buildDictationSegments({
      rawCues: toCueRecords(transcript.rawCues),
      rawText: transcript.rawText,
    })

    if (built.segments.length === 0) {
      result.skippedEmpty += 1
      continue
    }

    result.newSegmentTotal += built.segments.length

    if (dryRun) {
      result.resegmented += 1
      continue
    }

    const persisted = await persistRebuiltSegments({ transcript, video, built })

    result.resegmented += 1
    result.prunedReviewItems += persisted.prunedReviewItems
  }

  return result
}
