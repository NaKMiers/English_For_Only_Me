import { z } from 'zod'

import type { ApiErrorDecision } from './videoRouteDecisions'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const listReviewItemsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  videoId: objectIdSchema.optional(),
})

const recomputeReviewItemsSchema = z
  .object({
    videoId: objectIdSchema,
  })
  .strict()

const updateReviewItemSchema = z
  .object({
    action: z.enum(['complete', 'dismiss']),
    reviewItemId: objectIdSchema,
  })
  .strict()

export type ParsedListReviewItemsRequest = z.infer<typeof listReviewItemsSchema>
export type ParsedRecomputeReviewItemsRequest = z.infer<
  typeof recomputeReviewItemsSchema
>
export type ParsedUpdateReviewItemRequest = z.infer<
  typeof updateReviewItemSchema
>

export type ReviewItemRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

export function parseListReviewItemsRequest(
  searchParams: URLSearchParams
): ReviewItemRouteDecision<ParsedListReviewItemsRequest> {
  const result = listReviewItemsSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    videoId: searchParams.get('videoId') ?? undefined,
  })

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Review item filters are invalid.',
      },
    }

  return {
    ok: true,
    data: result.data,
  }
}

export function parseRecomputeReviewItemsRequest(
  body: unknown
): ReviewItemRouteDecision<ParsedRecomputeReviewItemsRequest> {
  const result = recomputeReviewItemsSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Review recompute payload is invalid.',
      },
    }

  return {
    ok: true,
    data: result.data,
  }
}

export function parseUpdateReviewItemRequest(
  body: unknown
): ReviewItemRouteDecision<ParsedUpdateReviewItemRequest> {
  const result = updateReviewItemSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Review item update payload is invalid.',
      },
    }

  return {
    ok: true,
    data: result.data,
  }
}
