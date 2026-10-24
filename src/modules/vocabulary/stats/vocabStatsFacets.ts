import type { PipelineStage } from 'mongoose'

import type {
  VocabDailyGrowthRecord,
  VocabStatsRecord,
  VocabUserItemStatus,
} from '@/modules/vocabulary/types'

/**
 * The vocabulary stats card used to cost ten queries per view: nine counts and
 * aggregations in parallel, then a sequential lookup for the hardest words'
 * terms. They read two collections, so they fold into two `$facet`
 * aggregations - one per collection, each a single round trip that scans the
 * user's rows once.
 *
 * Pure: pipeline builders and the result mapping are tested without a
 * database (vocabStatsFacets.test.ts).
 */

const DAY_MS = 86_400_000

interface CountRow {
  count: number
}

export interface VocabItemFacets {
  dueToday: CountRow[]
  growth: { _id: string; count: number }[]
  hardest: {
    correctCount?: number | null
    reviewCount?: number | null
    term: string | null
    vocabEntryId: unknown
    wrongCount?: number | null
  }[]
  learnedToday: CountRow[]
  overdue: CountRow[]
  statusCounts: { _id: VocabUserItemStatus; count: number }[]
}

export interface VocabAttemptFacets {
  reviewsToday: CountRow[]
  streakDays: { _id: string }[]
  summary: { correctCount: number; reviewCount: number }[]
}

export interface VocabStatsWindow {
  now: Date
  streakStart: Date
  today: Date
  tomorrow: Date
  trendStart: Date
}

function getStartOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function getDayLabel(date: Date) {
  return date.toISOString().slice(5, 10)
}

export function getVocabStatsWindow(
  now: Date,
  trendDays: number
): VocabStatsWindow {
  const today = getStartOfUtcDay(now)

  return {
    now,
    streakStart: new Date(today.getTime() - 365 * DAY_MS),
    today,
    tomorrow: new Date(today.getTime() + DAY_MS),
    trendStart: new Date(today.getTime() - (trendDays - 1) * DAY_MS),
  }
}

export function buildEmptyGrowth({
  days,
  now,
}: {
  days: number
  now: Date
}): VocabDailyGrowthRecord[] {
  const today = getStartOfUtcDay(now)

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today.getTime() - (days - index - 1) * DAY_MS)

    return {
      count: 0,
      label: getDayLabel(day),
    }
  })
}

export function buildEmptyVocabStats({
  now,
  trendDays,
}: {
  now: Date
  trendDays: number
}): VocabStatsRecord {
  return {
    accuracyPercent: 0,
    activeStreakDays: 0,
    alreadyKnowCount: 0,
    dailyGrowth: buildEmptyGrowth({ days: trendDays, now }),
    dueTodayCount: 0,
    hardestWords: [],
    learnedTodayCount: 0,
    learningCount: 0,
    masteredCount: 0,
    overdueCount: 0,
    reviewsTodayCount: 0,
    totalKnownCount: 0,
    totalStartedCount: 0,
  }
}

function buildActiveStreak(dayLabels: Set<string>, now: Date) {
  const today = getStartOfUtcDay(now)
  let streak = 0

  for (let index = 0; index < 365; index += 1) {
    const day = new Date(today.getTime() - index * DAY_MS)

    if (!dayLabels.has(day.toISOString().slice(0, 10))) break

    streak += 1
  }

  return streak
}

/** One aggregation over UserVocabItem for every per-item count on the card. */
export function buildVocabItemFacetPipeline({
  userId,
  vocabEntryCollection,
  window,
}: {
  userId: string
  vocabEntryCollection: string
  window: VocabStatsWindow
}): PipelineStage[] {
  const { now, today, tomorrow, trendStart } = window

  return [
    // Served by the userId-prefixed indexes; everything after works on the
    // user's own rows only.
    { $match: { userId } },
    {
      $project: {
        correctCount: 1,
        dueAt: 1,
        firstSeenAt: 1,
        reviewCount: 1,
        status: 1,
        updatedAt: 1,
        vocabEntryId: 1,
        wrongCount: 1,
      },
    },
    {
      $facet: {
        dueToday: [
          { $match: { dueAt: { $lte: now }, status: 'learning' } },
          { $count: 'count' },
        ],
        growth: [
          { $match: { firstSeenAt: { $gte: trendStart, $lt: tomorrow } } },
          {
            $group: {
              _id: {
                $dateToString: { date: '$firstSeenAt', format: '%Y-%m-%d' },
              },
              count: { $sum: 1 },
            },
          },
        ],
        hardest: [
          { $match: { wrongCount: { $gt: 0 } } },
          { $sort: { wrongCount: -1, reviewCount: -1, updatedAt: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              as: 'entry',
              foreignField: '_id',
              from: vocabEntryCollection,
              localField: 'vocabEntryId',
            },
          },
          {
            $project: {
              _id: 0,
              correctCount: 1,
              reviewCount: 1,
              term: { $ifNull: [{ $arrayElemAt: ['$entry.term', 0] }, null] },
              vocabEntryId: 1,
              wrongCount: 1,
            },
          },
        ],
        learnedToday: [
          { $match: { firstSeenAt: { $gte: today, $lt: tomorrow } } },
          { $count: 'count' },
        ],
        overdue: [
          { $match: { dueAt: { $lt: today }, status: 'learning' } },
          { $count: 'count' },
        ],
        statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      },
    },
  ]
}

/** One aggregation over VocabRecallAttempt for accuracy, today and streak. */
export function buildVocabAttemptFacetPipeline({
  userId,
  window,
}: {
  userId: string
  window: VocabStatsWindow
}): PipelineStage[] {
  const { streakStart, today, tomorrow } = window

  return [
    { $match: { userId } },
    { $project: { answeredAt: 1, isCorrect: 1 } },
    {
      $facet: {
        reviewsToday: [
          { $match: { answeredAt: { $gte: today, $lt: tomorrow } } },
          { $count: 'count' },
        ],
        streakDays: [
          { $match: { answeredAt: { $gte: streakStart, $lt: tomorrow } } },
          {
            $group: {
              _id: {
                $dateToString: { date: '$answeredAt', format: '%Y-%m-%d' },
              },
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              correctCount: { $sum: { $cond: ['$isCorrect', 1, 0] } },
              reviewCount: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]
}

function firstCount(rows: CountRow[]) {
  return rows[0]?.count ?? 0
}

/** Map the two facet results onto the stats card record. */
export function toVocabStatsRecord({
  attempts,
  items,
  now,
  trendDays,
}: {
  attempts: VocabAttemptFacets
  items: VocabItemFacets
  now: Date
  trendDays: number
}): VocabStatsRecord {
  const countByStatus = new Map(
    items.statusCounts.map(item => [item._id, item.count])
  )
  const learningCount = countByStatus.get('learning') ?? 0
  const alreadyKnowCount = countByStatus.get('alreadyKnow') ?? 0
  const masteredCount = countByStatus.get('mastered') ?? 0
  const growthByDay = new Map(
    items.growth.map(item => [item._id.slice(5), item.count])
  )
  const summary = attempts.summary[0]

  return {
    accuracyPercent:
      summary && summary.reviewCount > 0
        ? Math.round((summary.correctCount / summary.reviewCount) * 100)
        : 0,
    activeStreakDays: buildActiveStreak(
      new Set(attempts.streakDays.map(day => day._id)),
      now
    ),
    alreadyKnowCount,
    dailyGrowth: buildEmptyGrowth({ days: trendDays, now }).map(point => ({
      ...point,
      count: growthByDay.get(point.label) ?? 0,
    })),
    dueTodayCount: firstCount(items.dueToday),
    hardestWords: items.hardest.map(item => {
      const reviewCount = item.reviewCount ?? 0

      return {
        accuracyPercent:
          reviewCount > 0
            ? Math.round(((item.correctCount ?? 0) / reviewCount) * 100)
            : 0,
        reviewCount,
        term: item.term ?? 'Unknown word',
        vocabEntryId: String(item.vocabEntryId),
        wrongCount: item.wrongCount ?? 0,
      }
    }),
    learnedTodayCount: firstCount(items.learnedToday),
    learningCount,
    masteredCount,
    overdueCount: firstCount(items.overdue),
    reviewsTodayCount: firstCount(attempts.reviewsToday),
    totalKnownCount: alreadyKnowCount + masteredCount,
    totalStartedCount: learningCount + alreadyKnowCount + masteredCount,
  }
}
