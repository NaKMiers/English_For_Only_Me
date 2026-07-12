import 'server-only'

import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VOCAB_STATS_TREND_DAYS } from '@/modules/vocabulary/constants'
import type {
  VocabDailyGrowthRecord,
  VocabStatsRecord,
  VocabUserItemStatus,
} from '@/modules/vocabulary/types'

const DAY_MS = 86_400_000

interface StatusCountResult {
  _id: VocabUserItemStatus
  count: number
}

interface GrowthResult {
  _id: string
  count: number
}

interface AttemptSummaryResult {
  _id: null
  correctCount: number
  reviewCount: number
}

interface DayCountResult {
  _id: string
  count: number
}

function getStartOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function getDayLabel(date: Date) {
  return date.toISOString().slice(5, 10)
}

function buildEmptyGrowth({
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

export async function getVocabStatsForUser({
  now = new Date(),
  userId,
}: {
  now?: Date
  userId: string
}): Promise<VocabStatsRecord> {
  if (!userId)
    return {
      accuracyPercent: 0,
      activeStreakDays: 0,
      alreadyKnowCount: 0,
      dailyGrowth: buildEmptyGrowth({ days: VOCAB_STATS_TREND_DAYS, now }),
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

  const today = getStartOfUtcDay(now)
  const tomorrow = new Date(today.getTime() + DAY_MS)
  const trendStart = new Date(
    today.getTime() - (VOCAB_STATS_TREND_DAYS - 1) * DAY_MS
  )
  const streakStart = new Date(today.getTime() - 365 * DAY_MS)

  const [
    statusCounts,
    dueTodayCount,
    overdueCount,
    learnedTodayCount,
    growthCounts,
    attemptSummary,
    reviewsTodayCount,
    streakDays,
    hardItems,
  ] = await Promise.all([
    UserVocabItemModel.aggregate<StatusCountResult>([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    UserVocabItemModel.countDocuments({
      dueAt: { $lte: now },
      status: 'learning',
      userId,
    }),
    UserVocabItemModel.countDocuments({
      dueAt: { $lt: today },
      status: 'learning',
      userId,
    }),
    UserVocabItemModel.countDocuments({
      firstSeenAt: { $gte: today, $lt: tomorrow },
      userId,
    }),
    UserVocabItemModel.aggregate<GrowthResult>([
      {
        $match: {
          firstSeenAt: { $gte: trendStart, $lt: tomorrow },
          userId,
        },
      },
      {
        $group: {
          _id: { $dateToString: { date: '$firstSeenAt', format: '%Y-%m-%d' } },
          count: { $sum: 1 },
        },
      },
    ]),
    VocabRecallAttemptModel.aggregate<AttemptSummaryResult>([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          correctCount: {
            $sum: {
              $cond: ['$isCorrect', 1, 0],
            },
          },
          reviewCount: { $sum: 1 },
        },
      },
    ]),
    VocabRecallAttemptModel.countDocuments({
      answeredAt: { $gte: today, $lt: tomorrow },
      userId,
    }),
    VocabRecallAttemptModel.aggregate<DayCountResult>([
      {
        $match: {
          answeredAt: { $gte: streakStart, $lt: tomorrow },
          userId,
        },
      },
      {
        $group: {
          _id: { $dateToString: { date: '$answeredAt', format: '%Y-%m-%d' } },
          count: { $sum: 1 },
        },
      },
    ]),
    UserVocabItemModel.find({
      userId,
      wrongCount: { $gt: 0 },
    })
      .sort({ wrongCount: -1, reviewCount: -1, updatedAt: -1 })
      .limit(5)
      .lean(),
  ])

  const countByStatus = new Map(
    statusCounts.map(item => [item._id, item.count])
  )
  const learningCount = countByStatus.get('learning') ?? 0
  const alreadyKnowCount = countByStatus.get('alreadyKnow') ?? 0
  const masteredCount = countByStatus.get('mastered') ?? 0
  const growthByDay = new Map(
    growthCounts.map(item => [item._id.slice(5), item.count])
  )
  const dailyGrowth = buildEmptyGrowth({
    days: VOCAB_STATS_TREND_DAYS,
    now,
  }).map(point => ({
    ...point,
    count: growthByDay.get(point.label) ?? 0,
  }))
  const summary = attemptSummary[0]
  const accuracyPercent =
    summary && summary.reviewCount > 0
      ? Math.round((summary.correctCount / summary.reviewCount) * 100)
      : 0
  const hardEntries = await VocabEntryModel.find({
    _id: { $in: hardItems.map(item => item.vocabEntryId) },
  })
    .select({ term: 1 })
    .lean()
  const hardEntryById = new Map(
    hardEntries.map(entry => [String(entry._id), entry.term])
  )

  return {
    accuracyPercent,
    activeStreakDays: buildActiveStreak(
      new Set(streakDays.map(day => day._id)),
      now
    ),
    alreadyKnowCount,
    dailyGrowth,
    dueTodayCount,
    hardestWords: hardItems.map(item => ({
      accuracyPercent:
        item.reviewCount > 0
          ? Math.round(((item.correctCount ?? 0) / item.reviewCount) * 100)
          : 0,
      reviewCount: item.reviewCount ?? 0,
      term: hardEntryById.get(String(item.vocabEntryId)) ?? 'Unknown word',
      vocabEntryId: String(item.vocabEntryId),
      wrongCount: item.wrongCount ?? 0,
    })),
    learnedTodayCount,
    learningCount,
    masteredCount,
    overdueCount,
    reviewsTodayCount,
    totalKnownCount: alreadyKnowCount + masteredCount,
    totalStartedCount: learningCount + alreadyKnowCount + masteredCount,
  }
}
