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

  return {
    alreadyKnowCount,
    dailyGrowth: buildDailyGrowth({ days: trendDays, items, now }),
    dueTodayCount,
    learningCount,
    masteredCount,
    totalKnownCount: alreadyKnowCount + masteredCount,
    totalStartedCount: learningCount + alreadyKnowCount + masteredCount,
  }
}
