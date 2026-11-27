import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import {
  VocabularyStatsOverview,
  vocabStatusLinks,
} from './VocabularyStatsOverview'

const stats: VocabStatsRecord = {
  accuracyPercent: 80,
  activeStreakDays: 3,
  alreadyKnowCount: 12,
  dailyGrowth: [
    { count: 0, label: '11-26' },
    { count: 4, label: '11-27' },
  ],
  dueTodayCount: 5,
  hardestWords: [
    {
      accuracyPercent: 25,
      reviewCount: 4,
      term: 'ubiquitous',
      vocabEntryId: 'e1',
      wrongCount: 3,
    },
  ],
  learnedTodayCount: 2,
  learningCount: 7,
  masteredCount: 1,
  overdueCount: 0,
  reviewsTodayCount: 4,
  totalKnownCount: 13,
  totalStartedCount: 20,
}

describe('VocabularyStatsOverview', () => {
  test('links each count to its word-list view', () => {
    expect(
      vocabStatusLinks(stats).map(item => [item.href, item.value])
    ).toEqual([
      ['/vocabulary/words?view=learning', 7],
      ['/vocabulary/words?view=dueToday', 5],
      ['/vocabulary/words?view=alreadyKnow', 12],
      ['/vocabulary/words?view=mastered', 1],
      ['/vocabulary/words?view=knownTotal', 13],
    ])
  })

  test('renders the strip, the known share and the hardest words', () => {
    const html = renderToStaticMarkup(<VocabularyStatsOverview stats={stats} />)

    expect(html).toContain('href="/vocabulary/words?view=dueToday"')
    expect(html).toContain('65% known')
    expect(html).toContain('ubiquitous')
    expect(html).toContain('3 misses - 25%')
  })

  test('shows the empty hint when nothing was missed yet', () => {
    const html = renderToStaticMarkup(
      <VocabularyStatsOverview stats={{ ...stats, hardestWords: [] }} />
    )

    expect(html).toContain('No hard words yet.')
  })
})
