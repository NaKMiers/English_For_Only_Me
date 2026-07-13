import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import type { BuildSegmentsResult } from '@/modules/dictation/segmenting/types'
import type { DictationCueRecord } from '@/modules/dictation/types'

type TranscriptDoc = NonNullable<
  Awaited<ReturnType<typeof DictationTranscriptModel.findOne>>
>
type VideoDoc = NonNullable<
  Awaited<ReturnType<typeof DictationVideoModel.findOne>>
>

/** Normalize embedded transcript cues into the segmenting cue record shape. */
export function toCueRecords(
  cues: {
    endMs?: number | null
    index: number
    startMs?: number | null
    text: string
  }[]
): DictationCueRecord[] {
  return cues.map(cue => ({
    endMs: cue.endMs ?? null,
    index: cue.index,
    startMs: cue.startMs ?? null,
    text: cue.text,
  }))
}

export interface PersistRebuiltSegmentsResult {
  createdSegments: Awaited<ReturnType<typeof DictationSegmentModel.insertMany>>
  prunedReviewItems: number
}

/**
 * Persist a freshly built segment set for a transcript.
 *
 * DESTRUCTIVE: every segment is deleted and recreated with new ObjectIds, so
 * review items that referenced the old segments are pruned (scoped to the old
 * ids). Attempts are left intact - they keep expectedTextSnapshot, so
 * historical accuracy survives the rebuild.
 *
 *   old segments ──capture ids──▶ deleteMany ──▶ insertMany(new) ──▶ update
 *   counts ──▶ deleteMany review items referencing the old ids
 *
 * Shared by the build-segments API route and the bulk re-segment backfill so
 * the rebuild is defined once. Assumes `built.segments` is non-empty; the
 * caller decides what an empty build means (route: 409, backfill: skip).
 */
export async function persistRebuiltSegments({
  transcript,
  video,
  built,
}: {
  transcript: TranscriptDoc
  video: VideoDoc
  built: BuildSegmentsResult
}): Promise<PersistRebuiltSegmentsResult> {
  const staleSegmentIds = (
    await DictationSegmentModel.find(
      { transcriptId: transcript._id },
      { _id: 1 }
    ).lean()
  ).map(segment => segment._id)

  await DictationSegmentModel.deleteMany({ transcriptId: transcript._id })

  const createdSegments = await DictationSegmentModel.insertMany(
    built.segments.map(segment => ({
      videoId: video._id,
      transcriptId: transcript._id,
      transcriptSourceHash: transcript.sourceHash,
      order: segment.order,
      text: segment.text,
      normalizedText: segment.normalizedText,
      startMs: segment.startMs,
      endMs: segment.endMs,
      cueIndexes: segment.cueIndexes,
      qualityFlags: segment.qualityFlags,
      warningAccepted: segment.warningAccepted,
      attemptStatus: 'notStarted',
      attemptCount: 0,
    }))
  )

  transcript.segmentCount = createdSegments.length
  await transcript.save()

  video.status = 'ready'
  video.sentenceCount = createdSegments.length
  await video.save()

  let prunedReviewItems = 0

  if (staleSegmentIds.length > 0) {
    const result = await DictationReviewItemModel.deleteMany({
      segmentId: { $in: staleSegmentIds },
    })

    prunedReviewItems = result.deletedCount ?? 0
  }

  return { createdSegments, prunedReviewItems }
}
