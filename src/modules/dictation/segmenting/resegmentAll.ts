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
  prunedReviewItems: number
  oldSegmentTotal: number
  newSegmentTotal: number
}

/**
 * Re-run segmentation for every stored transcript so existing videos pick up
 * the current (pause-based) segment logic. Dry-run by default: it only reports
 * old-vs-new segment counts. With `dryRun: false` it rebuilds each transcript
 * via the shared {@link persistRebuiltSegments} (same destructive rebuild the
 * "Build Segments" button uses, including pruning orphaned review items).
 *
 * Idempotent: re-running produces the same segments for an unchanged transcript
 * (same rawCues in, same grouping out).
 */
export async function resegmentAllTranscripts({
  dryRun,
}: {
  dryRun: boolean
}): Promise<ResegmentAllResult> {
  const transcripts = await DictationTranscriptModel.find({})

  const result: ResegmentAllResult = {
    scanned: 0,
    resegmented: 0,
    skippedEmpty: 0,
    skippedNoVideo: 0,
    prunedReviewItems: 0,
    oldSegmentTotal: 0,
    newSegmentTotal: 0,
  }

  for (const transcript of transcripts) {
    result.scanned += 1
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

    const video = await DictationVideoModel.findOne({ _id: transcript.videoId })

    if (!video) {
      result.skippedNoVideo += 1
      continue
    }

    const persisted = await persistRebuiltSegments({ transcript, video, built })

    result.resegmented += 1
    result.prunedReviewItems += persisted.prunedReviewItems
  }

  return result
}
