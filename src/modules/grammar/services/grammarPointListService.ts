import 'server-only'

import type { SortOrder } from 'mongoose'

import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import type {
  GrammarPointListResult,
  GrammarPointApiRecord,
  GrammarUserItemStatus,
} from '@/modules/grammar/types'

import type { ParsedGrammarPointsQuery } from './grammarRouteDecisions'
import { toGrammarPointRecord } from './grammarPointRecords'
import { resolveContrastsWith } from './resolveContrastsWith'

/**
 * Build the Mongo filter from parsed query params.
 *
 * Merge stubs are always excluded: they exist only so a retired slug can
 * redirect learner progress, and they carry no body to show.
 *
 * Pure, so the filter logic is testable without a database.
 */
export function buildGrammarPointFilter(query: ParsedGrammarPointsQuery) {
  const filter: Record<string, unknown> = { mergedInto: null }

  if (query.cefrLevel) filter.cefrLevel = query.cefrLevel
  if (query.family) filter.family = query.family
  if (query.complexity) filter.complexity = query.complexity
  if (query.l1Risk) filter.l1Risk = query.l1Risk
  if (query.reviewStatus) filter.reviewStatus = query.reviewStatus

  if (query.q) {
    const pattern = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    filter.$or = [
      { title: { $options: 'i', $regex: pattern } },
      { summary: { $options: 'i', $regex: pattern } },
      { slug: { $options: 'i', $regex: pattern } },
    ]
  }

  return filter
}

/**
 * The default browse order, and the reason the two-axis taxonomy exists.
 *
 * High L1 risk first, then hardest, then earliest CEFR level. That surfaces the
 * low-level-but-brutal points - articles, plural -s, present perfect - ahead of
 * high-level-but-mechanical ones. A single-axis list sorted by CEFR level would
 * bury exactly the points this learner most needs.
 */
export function getGrammarBrowseSort(): [string, SortOrder][] {
  return [
    // MUST be l1RiskRank, not l1Risk. Mongo sorts strings lexicographically, so
    // sorting the enum descending gives medium > low > high and buries exactly
    // the points this ordering exists to surface. Caught against the real
    // database; a unit test on the array shape cannot see it.
    ['l1RiskRank', 'desc'],
    ['complexity', 'desc'],
    ['cefrLevel', 'asc'],
    ['family', 'asc'],
    ['order', 'asc'],
  ]
}

/**
 * The admin review queue: written but not yet human-reviewed.
 *
 * Pure, so the filter is testable without a database.
 */
export function buildGrammarReviewQueueFilter() {
  return {
    explanation: { $ne: null },
    mergedInto: null,
    reviewStatus: 'unverified' as const,
  }
}

/**
 * Load the review queue, hardest-transfer first.
 *
 * Deliberately reuses `getGrammarBrowseSort()` rather than declaring its own
 * order. A hand-rolled copy of that array lived here and drifted to the raw
 * `l1Risk` enum, which Mongo sorts lexicographically - so the capped queue
 * showed medium-risk points only and hid every high-risk lesson. Sharing the
 * helper also makes the queue deterministic within a risk tier, which matters
 * when the review is done across many sittings.
 */
export async function listGrammarReviewQueue(
  limit: number
): Promise<GrammarPointApiRecord[]> {
  const queue = await GrammarPointModel.find(buildGrammarReviewQueueFilter())
    .sort(getGrammarBrowseSort())
    .limit(limit)
    .lean()

  return queue.map(toGrammarPointRecord)
}

/**
 * Turn a study-status filter into a slug constraint.
 *
 * The learner's progress lives in `UserGrammarItem`, not on the point, so the
 * filter cannot be expressed as a field match. Resolving it to a slug set FIRST
 * and handing that to Mongo keeps `countDocuments`, `sort`, `skip` and `limit`
 * all working on one query - filtering in memory after paging would report a
 * total that disagrees with the page it came with.
 *
 * `notStarted` is the interesting one: it is the ABSENCE of a row, so it becomes
 * `$nin` over every slug the learner has touched.
 *
 * Returns null when there is nothing to constrain, so the caller can leave the
 * filter untouched rather than adding an always-true clause.
 */
export async function resolveStudySlugFilter({
  actorId,
  now = new Date(),
  studyStatus,
}: {
  actorId: string | null
  now?: Date
  studyStatus: ParsedGrammarPointsQuery['studyStatus']
}): Promise<Record<string, unknown> | null> {
  if (!studyStatus) return null

  // No actor means no progress, so every rule is "not started" and nothing else
  // can match. Saying so explicitly beats silently ignoring the filter.
  if (!actorId)
    return studyStatus === 'notStarted' ? null : { slug: { $in: [] } }

  if (studyStatus === 'notStarted') {
    const touched = await UserGrammarItemModel.find({ actorId })
      .select('pointSlug')
      .lean()

    return { slug: { $nin: touched.map(item => item.pointSlug) } }
  }

  // Two separate queries rather than one built from a union, because "due" is a
  // status AND a date, and merging the two shapes into one filter object loses
  // the typing Mongoose needs to check it.
  if (studyStatus === 'due') {
    const due = await UserGrammarItemModel.find({
      actorId,
      dueAt: { $lte: now, $ne: null },
      status: 'learning',
    })
      .select('pointSlug')
      .lean()

    return { slug: { $in: due.map(item => item.pointSlug) } }
  }

  const matching = await UserGrammarItemModel.find({ actorId, status: studyStatus })
    .select('pointSlug')
    .lean()

  return { slug: { $in: matching.map(item => item.pointSlug) } }
}

export async function listGrammarPoints(
  query: ParsedGrammarPointsQuery,
  /**
   * Whose progress to attach and filter by. Optional so the plain content
   * listing - admin queue, unauthenticated reads - keeps working unchanged.
   */
  actorId: string | null = null
): Promise<GrammarPointListResult> {
  const studyFilter = await resolveStudySlugFilter({
    actorId,
    studyStatus: query.studyStatus,
  })
  const filter = { ...buildGrammarPointFilter(query), ...studyFilter }
  const skip = (query.page - 1) * query.limit

  const [total, points] = await Promise.all([
    GrammarPointModel.countDocuments(filter),
    GrammarPointModel.find(filter)
      .sort(getGrammarBrowseSort())
      .skip(skip)
      .limit(query.limit)
      .lean(),
  ])

  // One extra query for the whole page, not one per point. Same rule
  // `dueQueueService` follows: a per-item lookup would make the map slower
  // exactly as the learner makes progress.
  const items = actorId
    ? await UserGrammarItemModel.find({
        actorId,
        pointSlug: { $in: points.map(point => point.slug) },
      })
        .select('pointSlug status recallStage dueAt')
        .lean()
    : []
  const itemBySlug = new Map(items.map(item => [item.pointSlug, item]))

  return {
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / query.limit)),
    points: points.map(point => {
      const item = itemBySlug.get(point.slug)

      return {
        ...toGrammarPointRecord(point),
        learner: item
          ? {
              dueAt: item.dueAt ? item.dueAt.toISOString() : null,
              recallStage: item.recallStage,
              status: item.status as GrammarUserItemStatus,
            }
          : null,
      }
    }),
    total,
  }
}

/**
 * Load one lesson. Follows a `mergedInto` redirect so a bookmark or a stored
 * learner item pointing at a retired slug still resolves to the surviving
 * point instead of 404ing.
 */
export async function getGrammarLesson(slug: string): Promise<
  | (GrammarPointApiRecord & {
      contrasts: Awaited<ReturnType<typeof resolveContrastsWith>>
      redirectedFrom: string | null
    })
  | null
> {
  const found = await GrammarPointModel.findOne({ slug }).lean()

  if (!found) return null

  const target = found.mergedInto
    ? await GrammarPointModel.findOne({ slug: found.mergedInto }).lean()
    : found

  if (!target) return null

  const record = toGrammarPointRecord(target)
  const contrasts = await resolveContrastsWith({
    ownContrasts: record.contrastsWith ?? [],
    slug: record.slug,
  })

  return {
    ...record,
    contrasts,
    redirectedFrom: found.mergedInto ? found.slug : null,
  }
}
