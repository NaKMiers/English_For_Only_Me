import 'server-only'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import { buildScarRecord } from '@/modules/grammar/presentation/buildScarRecord'
import {
  pickArchiveQuote,
  rankArchiveRows,
  type ArchiveCandidate,
} from '@/modules/grammar/presentation/rankArchiveRows'
import type { GrammarDrillRecord } from '@/modules/grammar/types'

export interface ArchiveRow extends ArchiveCandidate {
  quote: {
    occurrences: number
    prompt: string | null
    userAnswer: string
  } | null
}

export interface GrammarArchive {
  rows: ArchiveRow[]
  /** How many rules have ever caught this learner, before the row cap. */
  total: number
}

/**
 * "Your English": the rules that keep beating you, each quoting what you
 * actually wrote.
 *
 * Three queries regardless of history size. Every one is scoped by `actorId` -
 * this page is a record of one person's mistakes, and there is no version of it
 * that should ever be able to show somebody else's.
 *
 * Signed out returns the empty archive rather than throwing, and so does a
 * failed read: the page has authored copy for having nothing to show, and that
 * is a better outcome than a 500 on a page whose whole job is to be looked at.
 */
export async function getGrammarArchive({
  actorId,
  limit,
}: {
  actorId: string | null
  limit: number
}): Promise<GrammarArchive> {
  if (!actorId) return { rows: [], total: 0 }

  try {
    // Only rules that have actually caught the learner. A rule answered
    // correctly every time is not part of this record.
    const items = await UserGrammarItemModel.find({
      actorId,
      wrongCount: { $gt: 0 },
    })
      .select('pointSlug wrongCount recallStage')
      .lean()

    if (items.length === 0) return { rows: [], total: 0 }

    const points = await GrammarPointModel.find({
      slug: { $in: items.map(item => item.pointSlug) },
    })
      .select('slug title family cefrLevel l1RiskRank reviewStatus drills')
      .lean()
    const pointBySlug = new Map(points.map(point => [point.slug, point]))

    const candidates = items.flatMap<ArchiveCandidate>(item => {
      const point = pointBySlug.get(item.pointSlug)

      if (!point) return []

      return [
        {
          cefrLevel: point.cefrLevel,
          family: point.family,
          isUnverified: point.reviewStatus !== 'reviewed',
          // Already the effective rank: it is seeded from `effectiveL1Risk`.
          l1RiskRank: point.l1RiskRank ?? 2,
          pointSlug: item.pointSlug,
          recallStage: item.recallStage,
          title: point.title,
          wrongCount: item.wrongCount,
        },
      ]
    })

    const ranked = rankArchiveRows(candidates)
    const visible = ranked.slice(0, limit)
    const slugs = visible.map(row => row.pointSlug)

    // One read for every quoted row rather than one per row.
    const attempts = await GrammarDrillAttemptModel.find({
      actorId,
      pointSlug: { $in: slugs },
      verdict: 'wrong',
    })
      .select(
        'at drillId matchedAnswer pointSlug stageAfter stageBefore userAnswer verdict'
      )
      .lean()

    const attemptsBySlug = new Map<string, typeof attempts>()

    for (const attempt of attempts) {
      const bucket = attemptsBySlug.get(attempt.pointSlug) ?? []

      bucket.push(attempt)
      attemptsBySlug.set(attempt.pointSlug, bucket)
    }

    return {
      rows: visible.map(row => {
        const point = pointBySlug.get(row.pointSlug)
        // Prompts only. Never the drill: see `grammarScarService` for why.
        const promptByDrillId = new Map(
          ((point?.drills ?? []) as GrammarDrillRecord[]).map(drill => [
            drill.id,
            drill.prompt,
          ])
        )
        const scar = buildScarRecord({
          attempts: attemptsBySlug.get(row.pointSlug) ?? [],
          promptByDrillId,
        })

        return { ...row, quote: pickArchiveQuote(scar) }
      }),
      total: ranked.length,
    }
  } catch {
    return { rows: [], total: 0 }
  }
}
