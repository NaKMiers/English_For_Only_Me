import { z } from 'zod'

import type { DictationSessionRecord } from '@/models/dictation/DictationSessionModel'

import type { ApiErrorDecision } from './videoRouteDecisions'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const sessionStartSchema = z
  .object({
    videoId: objectIdSchema,
  })
  .strict()

const sessionPatchSchema = z
  .object({
    currentSegmentId: objectIdSchema.nullable().optional(),
    currentSegmentOrder: z.number().int().min(0).optional(),
    isVideoHidden: z.boolean().optional(),
    playbackSpeed: z.number().min(0.25).max(2).optional(),
    showShortcuts: z.boolean().optional(),
    status: z.enum(['active', 'completed', 'abandoned']).optional(),
  })
  .strict()

export type ParsedSessionStartRequest = z.infer<typeof sessionStartSchema>
export type ParsedSessionPatchRequest = z.infer<typeof sessionPatchSchema>

export type SessionRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

interface SessionGuardVideo {
  activeTranscriptId?: unknown
  status: string
}

interface SessionGuardSegment {
  _id: unknown
  order: number
}

export function parseSessionStartRequest(
  body: unknown
): SessionRouteDecision<ParsedSessionStartRequest> {
  const result = sessionStartSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Session start payload is invalid.',
      },
    }

  return {
    ok: true,
    data: result.data,
  }
}

export function parseSessionIdParam(
  sessionId: string
): SessionRouteDecision<{ sessionId: string }> {
  const result = objectIdSchema.safeParse(sessionId)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Session id is invalid.',
      },
    }

  return {
    ok: true,
    data: {
      sessionId: result.data,
    },
  }
}

export function parseSessionPatchRequest(
  body: unknown
): SessionRouteDecision<ParsedSessionPatchRequest> {
  const result = sessionPatchSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Session update payload is invalid.',
      },
    }

  return {
    ok: true,
    data: result.data,
  }
}

export function getSessionStartGuardDecision({
  firstSegment,
  video,
}: {
  firstSegment: SessionGuardSegment | null
  video: SessionGuardVideo | null
}): ApiErrorDecision | null {
  if (!video)
    return {
      status: 404,
      body: {
        message: 'This dictation video was not found.',
      },
    }

  if (!video.activeTranscriptId)
    return {
      status: 409,
      body: {
        message: 'This video needs an active transcript before practice.',
      },
    }

  if (!firstSegment)
    return {
      status: 409,
      body: {
        message: 'Build sentence segments before starting practice.',
      },
    }

  return null
}

export function resolveSessionStart({
  existingSession,
  firstSegment,
}: {
  existingSession: DictationSessionRecord | null
  firstSegment: SessionGuardSegment
}) {
  if (existingSession?.status === 'active')
    return {
      currentSegmentId: existingSession.currentSegmentId,
      currentSegmentOrder: existingSession.currentSegmentOrder,
      mode: 'resume' as const,
    }

  return {
    currentSegmentId: String(firstSegment._id),
    currentSegmentOrder: firstSegment.order,
    mode: 'start' as const,
  }
}
