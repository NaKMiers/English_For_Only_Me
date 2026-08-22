import { z } from 'zod'

import { hasMongoDbUri } from '@/constants/environments'
import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_FAMILIES,
  GRAMMAR_L1_RISKS,
  GRAMMAR_POINTS_DEFAULT_LIMIT,
  GRAMMAR_POINTS_MAX_LIMIT,
  GRAMMAR_RECALL_DEFAULT_LIMIT,
  GRAMMAR_RECALL_MAX_LIMIT,
  GRAMMAR_REVIEW_STATUSES,
  GRAMMAR_TEST_DEFAULT_QUESTIONS,
  GRAMMAR_TEST_MAX_QUESTIONS,
  GRAMMAR_TEST_SCOPES,
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

/**
 * What the learner asked to be tested on.
 *
 * Every filter array defaults to empty, and empty means "no constraint on this
 * axis" rather than "match nothing". That is the difference between a learner
 * who picked two families and one who picked none, and getting it backwards
 * turns the default test into an empty one.
 *
 * `scope` is the only field with a real default, because it is the only one
 * where "no opinion" has a sensible answer: draw from everything.
 */
const testStartSchema = z
  .object({
    cefrLevels: z.array(z.enum(GRAMMAR_CEFR_LEVELS)).max(6).default([]),
    complexities: z
      .array(z.union(GRAMMAR_COMPLEXITY_LEVELS.map(level => z.literal(level))))
      .max(5)
      .default([]),
    families: z.array(z.enum(GRAMMAR_FAMILIES)).max(17).default([]),
    l1Risks: z.array(z.enum(GRAMMAR_L1_RISKS)).max(3).default([]),
    questionCount: z.coerce
      .number()
      .int()
      .min(1)
      .max(GRAMMAR_TEST_MAX_QUESTIONS)
      .default(GRAMMAR_TEST_DEFAULT_QUESTIONS),
    scope: z.enum(GRAMMAR_TEST_SCOPES).default('all'),
  })
  .strict()

/**
 * A whole test, submitted once.
 *
 * No verdicts and no targets: the client sends what was typed or chosen, keyed
 * by the question id it was served. Everything needed to grade is re-read from
 * the session document server-side, which is what stops a stale page or a
 * tampered payload from writing its own score into the ladder.
 *
 * `sessionId` carries the idempotency. The submit route claims the session
 * atomically, so a double-tapped Submit replays the first result rather than
 * resetting the same points twice.
 */
const testSubmitSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            answer: z.string().max(4000).default(''),
            questionId: z.string().trim().min(1).max(80),
          })
          .strict()
      )
      .min(1)
      .max(GRAMMAR_TEST_MAX_QUESTIONS),
    sessionId: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{24}$/, 'Expected a session id.'),
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
export type ParsedGrammarTestStartRequest = z.infer<typeof testStartSchema>
export type ParsedGrammarTestSubmitRequest = z.infer<typeof testSubmitSchema>

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

export function parseGrammarTestStartRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarTestStartRequest> {
  const result = testStartSchema.safeParse(body ?? {})

  if (!result.success) return invalid('Grammar test configuration is invalid.')

  return { data: result.data, ok: true }
}

export function parseGrammarTestSubmitRequest(
  body: unknown
): GrammarRouteDecision<ParsedGrammarTestSubmitRequest> {
  const result = testSubmitSchema.safeParse(body)

  if (!result.success) return invalid('Grammar test submission is invalid.')

  return { data: result.data, ok: true }
}
