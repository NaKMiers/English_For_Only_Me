import { z } from 'zod'

import type { ApiErrorDecision } from './videoRouteDecisions'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const segmentEditSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('acceptWarning'),
  }),
  z.object({
    action: z.literal('edit'),
    endMs: z.number().int().min(0).nullable().optional(),
    startMs: z.number().int().min(0).nullable().optional(),
    text: z.string().trim().min(2).max(3000),
  }),
  z.object({
    action: z.literal('mergeNext'),
  }),
  z.object({
    action: z.literal('mergePrevious'),
  }),
  z.object({
    action: z.literal('split'),
    splitAt: z.number().int().min(1),
  }),
])

export type ParsedSegmentEditRequest = z.infer<typeof segmentEditSchema>

export type SegmentRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

interface SegmentGuardTranscript {
  _id: unknown
  ownerId: string
  qualityStatus: string
  sourceHash: string
}

interface SegmentGuardVideo {
  _id: unknown
  activeTranscriptId?: unknown
  ownerId: string
}

export function parseTranscriptIdParam(
  transcriptId: string
): SegmentRouteDecision<{ transcriptId: string }> {
  const result = objectIdSchema.safeParse(transcriptId)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Transcript id is invalid.',
      },
    }

  return {
    ok: true,
    data: {
      transcriptId: result.data,
    },
  }
}

export function parseSegmentIdParam(
  segmentId: string
): SegmentRouteDecision<{ segmentId: string }> {
  const result = objectIdSchema.safeParse(segmentId)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Segment id is invalid.',
      },
    }

  return {
    ok: true,
    data: {
      segmentId: result.data,
    },
  }
}

export function parseSegmentEditRequest(
  body: unknown
): SegmentRouteDecision<ParsedSegmentEditRequest> {
  const result = segmentEditSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Segment edit payload is invalid.',
      },
    }

  if (
    result.data.action === 'edit' &&
    result.data.startMs !== undefined &&
    result.data.endMs !== undefined &&
    result.data.startMs !== null &&
    result.data.endMs !== null &&
    result.data.startMs >= result.data.endMs
  )
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Segment start time must be before end time.',
      },
    }

  return {
    ok: true,
    data: result.data,
  }
}

export function getSegmentBuildGuardDecision({
  ownerId,
  transcript,
  video,
}: {
  ownerId: string
  transcript: SegmentGuardTranscript | null
  video: SegmentGuardVideo | null
}): ApiErrorDecision | null {
  if (!transcript || transcript.ownerId !== ownerId)
    return {
      status: 404,
      body: {
        message: 'This transcript was not found.',
      },
    }

  if (!video || video.ownerId !== ownerId)
    return {
      status: 404,
      body: {
        message: 'This dictation video was not found.',
      },
    }

  if (transcript.qualityStatus === 'blocked')
    return {
      status: 409,
      body: {
        message:
          'This transcript is blocked by quality checks and cannot be segmented.',
      },
    }

  if (String(video.activeTranscriptId ?? '') !== String(transcript._id))
    return {
      status: 409,
      body: {
        message:
          'This transcript is no longer the active source for the video. Reload before segmenting.',
      },
    }

  return null
}

export function getSegmentEditGuardDecision({
  ownerId,
  segmentSourceHash,
  transcript,
  video,
}: {
  ownerId: string
  segmentSourceHash: string
  transcript: SegmentGuardTranscript | null
  video: SegmentGuardVideo | null
}): ApiErrorDecision | null {
  const buildGuard = getSegmentBuildGuardDecision({
    ownerId,
    transcript,
    video,
  })

  if (buildGuard) return buildGuard

  if (transcript && segmentSourceHash !== transcript.sourceHash)
    return {
      status: 409,
      body: {
        message:
          'Segments were built from an older transcript source. Rebuild segments before editing.',
      },
    }

  return null
}
