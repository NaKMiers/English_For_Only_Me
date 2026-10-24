import type { PipelineStage } from 'mongoose'
import { describe, expect, it } from 'vitest'

import type {
  VocabDailyGrowthRecord,
  VocabStatsRecord,
  VocabUserItemStatus,
} from '@/modules/vocabulary/types'

import {
  buildEmptyVocabStats,
  buildVocabAttemptFacetPipeline,
  buildVocabItemFacetPipeline,
  getVocabStatsWindow,
  toVocabStatsRecord,
  type VocabAttemptFacets,
  type VocabItemFacets,
} from './vocabStatsFacets'

// MARK: Legacy reference

// Frozen copy of the mapping getVocabStatsForUser ran over its ten separate
// query results before they were folded into two $facet aggregations.

const DAY_MS = 86_400_000

interface LegacyQueryResults {
  attemptSummary: { _id: null; correctCount: number; reviewCount: number }[]
  dueTodayCount: number
  growthCounts: { _id: string; count: number }[]
  hardEntries: { _id: string; term: string }[]
  hardItems: {
    correctCount?: number
    reviewCount: number
    vocabEntryId: string
    wrongCount?: number
  }[]
  learnedTodayCount: number
  overdueCount: number
  reviewsTodayCount: number
  statusCounts: { _id: VocabUserItemStatus; count: number }[]
  streakDays: { _id: string; count: number }[]
}

function legacyStartOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function legacyEmptyGrowth(days: number, now: Date): VocabDailyGrowthRecord[] {
  const today = legacyStartOfUtcDay(now)

  return Array.from({ length: days }, (_, index) => ({
    count: 0,
    label: new Date(today.getTime() - (days - index - 1) * DAY_MS)
      .toISOString()
      .slice(5, 10),
  }))
}

function legacyStreak(dayLabels: Set<string>, now: Date) {
  const today = legacyStartOfUtcDay(now)
  let streak = 0

  for (let index = 0; index < 365; index += 1) {
    const day = new Date(today.getTime() - index * DAY_MS)

    if (!dayLabels.has(day.toISOString().slice(0, 10))) break

    streak += 1
  }

  return streak
}

function legacyMapping(
  results: LegacyQueryResults,
  now: Date,
  trendDays: number
): VocabStatsRecord {
  const countByStatus = new Map(
    results.statusCounts.map(item => [item._id, item.count])
  )
  const learningCount = countByStatus.get('learning') ?? 0
  const alreadyKnowCount = countByStatus.get('alreadyKnow') ?? 0
  const masteredCount = countByStatus.get('mastered') ?? 0
  const growthByDay = new Map(
    results.growthCounts.map(item => [item._id.slice(5), item.count])
  )
  const dailyGrowth = legacyEmptyGrowth(trendDays, now).map(point => ({
    ...point,
    count: growthByDay.get(point.label) ?? 0,
  }))
  const summary = results.attemptSummary[0]
  const accuracyPercent =
    summary && summary.reviewCount > 0
      ? Math.round((summary.correctCount / summary.reviewCount) * 100)
      : 0
  const hardEntryById = new Map(
    results.hardEntries.map(entry => [String(entry._id), entry.term])
  )

  return {
    accuracyPercent,
    activeStreakDays: legacyStreak(
      new Set(results.streakDays.map(day => day._id)),
      now
    ),
    alreadyKnowCount,
    dailyGrowth,
    dueTodayCount: results.dueTodayCount,
    hardestWords: results.hardItems.map(item => ({
      accuracyPercent:
        item.reviewCount > 0
          ? Math.round(((item.correctCount ?? 0) / item.reviewCount) * 100)
          : 0,
      reviewCount: item.reviewCount ?? 0,
      term: hardEntryById.get(String(item.vocabEntryId)) ?? 'Unknown word',
      vocabEntryId: String(item.vocabEntryId),
      wrongCount: item.wrongCount ?? 0,
    })),
    learnedTodayCount: results.learnedTodayCount,
    learningCount,
    masteredCount,
    overdueCount: results.overdueCount,
    reviewsTodayCount: results.reviewsTodayCount,
    totalKnownCount: alreadyKnowCount + masteredCount,
    totalStartedCount: learningCount + alreadyKnowCount + masteredCount,
  }
}

// MARK: Facet shape

// What MongoDB returns for the same data from the two $facet aggregations.
// `$count` emits NO document for zero matches, hence the empty arrays.
function toFacets(results: LegacyQueryResults): {
  attempts: VocabAttemptFacets
  items: VocabItemFacets
} {
  const count = (value: number) => (value > 0 ? [{ count: value }] : [])
  const termById = new Map(
    results.hardEntries.map(entry => [entry._id, entry.term])
  )

  return {
    attempts: {
      reviewsToday: count(results.reviewsTodayCount),
      streakDays: results.streakDays.map(day => ({ _id: day._id })),
      summary: results.attemptSummary.map(row => ({
        correctCount: row.correctCount,
        reviewCount: row.reviewCount,
      })),
    },
    items: {
      dueToday: count(results.dueTodayCount),
      growth: results.growthCounts,
      hardest: results.hardItems.map(item => ({
        ...item,
        term: termById.get(item.vocabEntryId) ?? null,
      })),
      learnedToday: count(results.learnedTodayCount),
      overdue: count(results.overdueCount),
      statusCounts: results.statusCounts,
    },
  }
}

const now = new Date('2026-10-24T15:30:00.000Z')
const trendDays = 14

describe('vocab stats facets parity', () => {
  it('maps a busy learner exactly like the ten-query version', () => {
    const results: LegacyQueryResults = {
      attemptSummary: [{ _id: null, correctCount: 41, reviewCount: 57 }],
      dueTodayCount: 6,
      growthCounts: [
        { _id: '2026-10-24', count: 3 },
        { _id: '2026-10-20', count: 7 },
        { _id: '2026-10-11', count: 2 },
      ],
      hardEntries: [
        { _id: 'e1', term: 'though' },
        { _id: 'e2', term: 'thorough' },
      ],
      hardItems: [
        { correctCount: 1, reviewCount: 6, vocabEntryId: 'e1', wrongCount: 5 },
        { reviewCount: 0, vocabEntryId: 'e2', wrongCount: 3 },
        // Its entry was deleted: the card says "Unknown word".
        {
          correctCount: 2,
          reviewCount: 4,
          vocabEntryId: 'gone',
          wrongCount: 2,
        },
      ],
      learnedTodayCount: 3,
      overdueCount: 2,
      reviewsTodayCount: 9,
      statusCounts: [
        { _id: 'learning', count: 30 },
        { _id: 'mastered', count: 12 },
        { _id: 'alreadyKnow', count: 5 },
      ],
      streakDays: [
        { _id: '2026-10-24', count: 4 },
        { _id: '2026-10-23', count: 1 },
        { _id: '2026-10-22', count: 2 },
        { _id: '2026-10-19', count: 2 },
      ],
    }
    const facets = toFacets(results)

    const expected = legacyMapping(results, now, trendDays)

    expect(toVocabStatsRecord({ ...facets, now, trendDays })).toEqual(expected)
    expect(expected.activeStreakDays).toBe(3)
    expect(expected.hardestWords[2]?.term).toBe('Unknown word')
  })

  it('maps zero counts (no $count document) like the countDocuments zeros', () => {
    const results: LegacyQueryResults = {
      attemptSummary: [],
      dueTodayCount: 0,
      growthCounts: [],
      hardEntries: [],
      hardItems: [],
      learnedTodayCount: 0,
      overdueCount: 0,
      reviewsTodayCount: 0,
      statusCounts: [],
      streakDays: [],
    }

    const mapped = toVocabStatsRecord({ ...toFacets(results), now, trendDays })

    expect(mapped).toEqual(legacyMapping(results, now, trendDays))
    expect(mapped).toEqual(buildEmptyVocabStats({ now, trendDays }))
  })
})

describe('vocab stats pipelines', () => {
  const window = getVocabStatsWindow(now, trendDays)

  it('uses the same day boundaries as the old queries', () => {
    expect(window.today.toISOString()).toBe('2026-10-24T00:00:00.000Z')
    expect(window.tomorrow.toISOString()).toBe('2026-10-25T00:00:00.000Z')
    expect(window.trendStart.toISOString()).toBe('2026-10-11T00:00:00.000Z')
    expect(window.streakStart.toISOString()).toBe('2025-10-24T00:00:00.000Z')
  })

  it('scopes both aggregations to the user before anything else', () => {
    const items = buildVocabItemFacetPipeline({
      userId: 'u1',
      vocabEntryCollection: 'vocabentries',
      window,
    })
    const attempts = buildVocabAttemptFacetPipeline({ userId: 'u1', window })

    expect(items[0]).toEqual({ $match: { userId: 'u1' } })
    expect(attempts[0]).toEqual({ $match: { userId: 'u1' } })
    expect(
      Object.keys((items.at(-1) as PipelineStage.Facet).$facet).sort()
    ).toEqual([
      'dueToday',
      'growth',
      'hardest',
      'learnedToday',
      'overdue',
      'statusCounts',
    ])
    expect(
      Object.keys((attempts.at(-1) as PipelineStage.Facet).$facet).sort()
    ).toEqual(['reviewsToday', 'streakDays', 'summary'])
  })
})
