import type {
  UserVocabItemApiRecord,
  VocabDailyGrowthRecord,
  VocabStatsRecord,
} from '@/modules/vocabulary/types'

const DAY_MS = 86_400_000

function getStartOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function getDayLabel(date: Date) {
  return date.toISOString().slice(5, 10)
}

export function buildDailyGrowth({
  days,
  items,
  now = new Date(),
}: {
  days: number
  items: Pick<UserVocabItemApiRecord, 'firstSeenAt'>[]
  now?: Date
}): VocabDailyGrowthRecord[] {
  const today = getStartOfUtcDay(now)

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today.getTime() - (days - index - 1) * DAY_MS)
    const nextDay = new Date(day.getTime() + DAY_MS)

    return {
      count: items.filter(
        item => item.firstSeenAt >= day && item.firstSeenAt < nextDay
      ).length,
      label: getDayLabel(day),
    }
  })
}

export function aggregateVocabStats({
  items,
  now = new Date(),
  trendDays,
}: {
  items: UserVocabItemApiRecord[]
  now?: Date
  trendDays: number
}): VocabStatsRecord {
  const learningCount = items.filter(item => item.status === 'learning').length
  const alreadyKnowCount = items.filter(
    item => item.status === 'alreadyKnow'
  ).length
  const masteredCount = items.filter(item => item.status === 'mastered').length
  const dueTodayCount = items.filter(
    item => item.status === 'learning' && item.dueAt && item.dueAt <= now
  ).length
  const today = getStartOfUtcDay(now)
  const tomorrow = new Date(today.getTime() + DAY_MS)
  const learnedTodayCount = items.filter(
    item => item.firstSeenAt >= today && item.firstSeenAt < tomorrow
  ).length
  const reviewsTodayCount = items.filter(
    item =>
      item.lastReviewedAt &&
      item.lastReviewedAt >= today &&
      item.lastReviewedAt < tomorrow
  ).length
  const reviewedDays = new Set(
    items
      .filter(item => item.lastReviewedAt)
      .map(item => item.lastReviewedAt?.toISOString().slice(0, 10))
      .filter((label): label is string => Boolean(label))
  )
  let activeStreakDays = 0

  for (let index = 0; index < 365; index += 1) {
    const day = new Date(today.getTime() - index * DAY_MS)

    if (!reviewedDays.has(day.toISOString().slice(0, 10))) break

    activeStreakDays += 1
  }
  const correctCount = items.reduce(
    (total, item) => total + item.correctCount,
    0
  )
  const reviewCount = items.reduce((total, item) => total + item.reviewCount, 0)

  return {
    accuracyPercent:
      reviewCount > 0 ? Math.round((correctCount / reviewCount) * 100) : 0,
    activeStreakDays,
    alreadyKnowCount,
    dailyGrowth: buildDailyGrowth({ days: trendDays, items, now }),
    dueTodayCount,
    hardestWords: items
      .filter(item => item.wrongCount > 0)
      .sort((left, right) => right.wrongCount - left.wrongCount)
      .slice(0, 5)
      .map(item => ({
        accuracyPercent:
          item.reviewCount > 0
            ? Math.round((item.correctCount / item.reviewCount) * 100)
            : 0,
        reviewCount: item.reviewCount,
        term: item.vocabEntryId,
        vocabEntryId: item.vocabEntryId,
        wrongCount: item.wrongCount,
      })),
    learnedTodayCount,
    learningCount,
    masteredCount,
    overdueCount: items.filter(
      item => item.status === 'learning' && item.dueAt && item.dueAt < today
    ).length,
    reviewsTodayCount,
    totalKnownCount: alreadyKnowCount + masteredCount,
    totalStartedCount: learningCount + alreadyKnowCount + masteredCount,
  }
}
