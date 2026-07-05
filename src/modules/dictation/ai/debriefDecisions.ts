import { z } from 'zod'

import type { ApiErrorDecision } from '@/modules/dictation/services/videoRouteDecisions'
import type { DictationDebriefStatus } from '@/modules/dictation/types'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const debriefPayloadSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    videoId: objectIdSchema,
  })
  .strict()

export type ParsedDebriefPayload = {
  notes: string
  videoId: string
}

export type DebriefRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

export function parseDebriefPayload(
  body: unknown
): DebriefRouteDecision<ParsedDebriefPayload> {
  const result = debriefPayloadSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Debrief payload is invalid.',
      },
    }

  return {
    ok: true,
    data: {
      notes: result.data.notes ?? '',
      videoId: result.data.videoId,
    },
  }
}

export function getDebriefCompletionBlocker({
  completedSegmentCount,
  hasCompletedSession,
}: {
  completedSegmentCount: number
  hasCompletedSession: boolean
}) {
  if (!hasCompletedSession) return 'Complete this video before debriefing.'

  if (completedSegmentCount <= 0)
    return 'Finish at least one saved segment before debriefing.'

  return null
}

export function shouldCreateDebriefAttempt(
  latestStatus: DictationDebriefStatus | null
) {
  return latestStatus !== 'ready'
}
