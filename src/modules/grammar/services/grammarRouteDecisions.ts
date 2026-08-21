import { z } from 'zod'

import { hasMongoDbUri } from '@/constants/environments'
import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_DIAGNOSTIC_DEFAULT_LIMIT,
  GRAMMAR_DIAGNOSTIC_MAX_LIMIT,
  GRAMMAR_FAMILIES,
  GRAMMAR_L1_RISKS,
  GRAMMAR_POINTS_DEFAULT_LIMIT,
  GRAMMAR_POINTS_MAX_LIMIT,
  GRAMMAR_RECALL_DEFAULT_LIMIT,
  GRAMMAR_RECALL_MAX_LIMIT,
  GRAMMAR_REVIEW_STATUSES,
  GRAMMAR_USER_ITEM_STATUSES,
} from '@/modules/grammar/constants'

type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503

export interface GrammarApiErrorDecision {
  status: ApiErrorStatus
  body: {
    message: string
  }
}

export const GRAMMAR_MISSING_MONGODB_MESSAGE =
  'MongoDB is not configured. Set MONGODB_URI on the server to use the grammar module.'

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a kebab-case slug.')

/**
 * Empty strings arrive from unset `<select>` elements, so treat them as absent
 * rather than as an invalid enum value.
 */
function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T
) {
  return z
    .preprocess(
      value => (value === '' || value == null ? undefined : value),
      z.enum(values).optional()
    )
    .transform(value => value ?? null)
}

const pointsQuerySchema = z.object({
  cefrLevel: optionalEnum(GRAMMAR_CEFR_LEVELS),
  complexity: z
    .preprocess(
      value => (value === '' || value == null ? undefined : value),
      z.coerce.number().int().min(1).max(5).optional()
    )
    .transform(value => value ?? null),
  family: optionalEnum(GRAMMAR_FAMILIES),
  l1Risk: optionalEnum(GRAMMAR_L1_RISKS),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(GRAMMAR_POINTS_MAX_LIMIT)
    .default(GRAMMAR_POINTS_DEFAULT_LIMIT),
  page: z.coerce.number().int().min(1).default(1),
  q: z
    .preprocess(
      value => (value === '' || value == null ? undefined : value),
      z.string().trim().min(1).max(120).optional()
    )
    .transform(value => value ?? null),
  reviewStatus: optionalEnum(GRAMMAR_REVIEW_STATUSES),
})

const pointSlugSchema = z.object({ slug: slugSchema })

const reviewSchema = z
  .object({
    reviewStatus: z.enum(GRAMMAR_REVIEW_STATUSES),
    slug: slugSchema,
  })
  .strict()

/**
 * A judgment about how hard a point really is.
 *
 * `l1RiskObserved` accepts null so a judgment can be cleared. `.strict()`
 * matters more here than elsewhere: this payload writes to a committed source
 * file, and an unexpected key is a sign the caller means something the server
 * does not implement.
 */
const l1RiskObservedSchema = z
  .object({
    l1RiskObserved: z.enum(GRAMMAR_L1_RISKS).nullable(),
    slug: slugSchema,
  })
  .strict()

const acceptAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(2000),
    drillId: z.string().trim().min(1).max(80),
    slug: slugSchema,
  })
  .strict()

const recallDueSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(GRAMMAR_RECALL_MAX_LIMIT)
    .default(GRAMMAR_RECALL_DEFAULT_LIMIT),
})

/**
 * The answer payload carries NO expected answer and NO verdict. The server
 * re-reads the drill and grades it; the client only reports what was typed.
 * `idempotencyKey` is minted when the drill is served and echoed back here, so
 * a retry replays the original outcome instead of advancing the ladder twice.
 */
const recallAnswerSchema = z
  .object({
    answer: z.string().max(4000).default(''),
    drillId: z.string().trim().min(1).max(80),
    idempotencyKey: z.string().trim().min(8).max(160),
    revealed: z.boolean().default(false),
    slug: slugSchema,
  })
  .strict()

const itemStatusSchema = z
  .object({
    slug: slugSchema,
    status: z.enum(GRAMMAR_USER_ITEM_STATUSES),
  })
  .strict()

const diagnosticBuildSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(GRAMMAR_DIAGNOSTIC_MAX_LIMIT)
    .default(GRAMMAR_DIAGNOSTIC_DEFAULT_LIMIT),
})

/**
 * Diagnostic answers carry no verdicts. `sessionKey` makes the whole submission
 * idempotent, so a retried or double-clicked submit cannot seed the ladder twice.
 */
const diagnosticSubmitSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            answer: z.string().max(4000).default(''),
            drillId: z.string().trim().min(1).max(80),
            pointSlug: slugSchema,
          })
          .strict()
      )
      .min(1)
      .max(GRAMMAR_DIAGNOSTIC_MAX_LIMIT),
    sessionKey: z.string().trim().min(8).max(160),
  })
  .strict()

export type ParsedGrammarPointsQuery = z.infer<typeof pointsQuerySchema>
export type ParsedGrammarPointSlug = z.infer<typeof pointSlugSchema>
export type ParsedGrammarReviewRequest = z.infer<typeof reviewSchema>
export type ParsedL1RiskObservedRequest = z.infer<typeof l1RiskObservedSchema>
export type ParsedGrammarAcceptAnswerRequest = z.infer<
  typeof acceptAnswerSchema
>
export type ParsedGrammarRecallDueRequest = z.infer<typeof recallDueSchema>
export type ParsedGrammarRecallAnswerRequest = z.infer<
  typeof recallAnswerSchema
>
export type ParsedGrammarItemStatusRequest = z.infer<typeof itemStatusSchema>
export type ParsedGrammarDiagnosticBuildRequest = z.infer<
  typeof diagnosticBuildSchema
>
export type ParsedGrammarDiagnosticSubmitRequest = z.infer<
  typeof diagnosticSubmitSchema
>

export type GrammarRouteDecision<T> =
  { data: T; ok: true } | (GrammarApiErrorDecision & { ok: false })

function invalid(message: string): GrammarApiErrorDecision & { ok: false } {
  return {
    body: { message },
    ok: false,
    status: 400,
  }
}

export function getMissingGrammarMongoResponse() {
  if (hasMongoDbUri()) return null

  return {
    status: 500,
    body: {
      message: GRAMMAR_MISSING_MONGODB_MESSAGE,
    },
  } satisfies GrammarApiErrorDecision
}

export function parseGrammarPointsQuery(
  searchParams: URLSearchParams
): GrammarRouteDecision<ParsedGrammarPointsQuery> {
  const result = pointsQuerySchema.safeParse({
    cefrLevel: searchParams.get('cefrLevel') ?? undefined,
    complexity: searchParams.get('complexity') ?? undefined,
    family: searchParams.get('family') ?? undefined,
    l1Risk: searchParams.get('l1Risk') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    reviewStatus: searchParams.get('reviewStatus') ?? undefined,
  })

  if (!result.success) return invalid('Grammar point query is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarPointSlug(
  slug: unknown
): GrammarRouteDecision<ParsedGrammarPointSlug> {
  const result = pointSlugSchema.safeParse({ slug })

  if (!result.success) return invalid('Grammar point slug is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarReviewRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarReviewRequest> {
  const result = reviewSchema.safeParse(body)

  if (!result.success) return invalid('Grammar review payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseL1RiskObservedRequest(
  body: unknown
): GrammarRouteDecision<ParsedL1RiskObservedRequest> {
  const result = l1RiskObservedSchema.safeParse(body)

  if (!result.success) return invalid('L1 risk judgment payload is invalid.')

  return { data: result.data, ok: true }
}

/**
 * Is the l1Risk review tool available?
 *
 * Local checkout only. The tool writes to a committed source file, which a
 * deployed runtime has no business doing - a serverless filesystem is ephemeral,
 * so a "successful" write there would silently vanish, and on a long-lived host
 * it would put untracked edits into a running deployment. Both fail in ways the
 * builder would only notice by finding their judgment gone.
 */
export function isL1RiskToolEnabled() {
  return process.env.NODE_ENV === 'development'
}

export function parseGrammarAcceptAnswerRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarAcceptAnswerRequest> {
  const result = acceptAnswerSchema.safeParse(body)

  if (!result.success)
    return invalid('Grammar accept-answer payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarRecallDueRequest(
  searchParams: URLSearchParams
): GrammarRouteDecision<ParsedGrammarRecallDueRequest> {
  const result = recallDueSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!result.success) return invalid('Grammar recall query is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarRecallAnswerRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarRecallAnswerRequest> {
  const result = recallAnswerSchema.safeParse(body)

  if (!result.success) return invalid('Grammar recall payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarItemStatusRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarItemStatusRequest> {
  const result = itemStatusSchema.safeParse(body)

  if (!result.success) return invalid('Grammar item payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarDiagnosticBuildRequest(
  searchParams: URLSearchParams
): GrammarRouteDecision<ParsedGrammarDiagnosticBuildRequest> {
  const result = diagnosticBuildSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!result.success) return invalid('Grammar diagnostic query is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarDiagnosticSubmitRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarDiagnosticSubmitRequest> {
  const result = diagnosticSubmitSchema.safeParse(body)

  if (!result.success) return invalid('Grammar diagnostic payload is invalid.')

  return { data: result.data, ok: true }
}
