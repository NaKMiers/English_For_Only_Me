import 'server-only'

import type { SortOrder } from 'mongoose'

import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import type {
  GrammarPointListResult,
  GrammarPointApiRecord,
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

export async function listGrammarPoints(
  query: ParsedGrammarPointsQuery
): Promise<GrammarPointListResult> {
  const filter = buildGrammarPointFilter(query)
  const skip = (query.page - 1) * query.limit

  const [total, points] = await Promise.all([
    GrammarPointModel.countDocuments(filter),
    GrammarPointModel.find(filter)
      .sort(getGrammarBrowseSort())
      .skip(skip)
      .limit(query.limit)
      .lean(),
  ])

  return {
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / query.limit)),
    points: points.map(toGrammarPointRecord),
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
