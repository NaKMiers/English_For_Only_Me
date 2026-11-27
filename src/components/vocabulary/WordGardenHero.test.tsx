import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import { WordGardenHero } from './WordGardenHero'

const stats: VocabStatsRecord = {
  accuracyPercent: 80,
  activeStreakDays: 3,
  alreadyKnowCount: 2900,
  dailyGrowth: [],
  dueTodayCount: 12,
  hardestWords: [],
  learnedTodayCount: 7,
  learningCount: 40,
  masteredCount: 296,
  overdueCount: 0,
  reviewsTodayCount: 9,
  totalKnownCount: 3196,
  totalStartedCount: 3300,
}

describe('WordGardenHero', () => {
  test('grows the garden to the stage the known words reach', () => {
    const html = renderToStaticMarkup(<WordGardenHero stats={stats} />)

    expect(html).toContain('3,196')
    expect(html).toContain('aria-label="Young tree (about B1): you are here"')
    expect(html).toContain('54 words to Tree (about B2)')
    expect(html).toContain('aria-label="Forest (about C2): 1804 words away"')
  })

  test('links each step of a word into the word list', () => {
    const html = renderToStaticMarkup(<WordGardenHero stats={stats} />)

    expect(html).toContain('href="/vocabulary/words?view=learning"')
    expect(html).toContain('href="/vocabulary/words?view=dueToday"')
    expect(html).toContain('href="/vocabulary/words?view=mastered"')
    expect(html).toContain('href="/vocabulary/words?view=knownTotal"')
  })
})
