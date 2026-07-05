import { z } from 'zod'

import type { ApiErrorDecision } from './videoRouteDecisions'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

export type StatsRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

export function parseStatsSearchParams(
  searchParams: URLSearchParams
): StatsRouteDecision<
  { scope: 'global' } | { scope: 'video'; videoId: string }
> {
  const videoId = searchParams.get('videoId')

  if (!videoId)
    return {
      ok: true,
      data: {
        scope: 'global',
      },
    }

  const result = objectIdSchema.safeParse(videoId)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'A valid videoId query parameter is required.',
      },
    }

  return {
    ok: true,
    data: {
      scope: 'video',
      videoId: result.data,
    },
  }
}
