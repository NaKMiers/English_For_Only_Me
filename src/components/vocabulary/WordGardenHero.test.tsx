import { fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

import { expectLandingBudget } from '@/test/landingBudget'

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

const plant = { href: '#vocab-explore', kind: 'plant' as const }

describe('WordGardenHero', () => {
  test('grows the garden to the stage the known words reach', () => {
    const html = renderToStaticMarkup(
      <WordGardenHero
        next={plant}
        stats={stats}
      />
    )

    expect(html).toContain('3,196')
    expect(html).toContain('aria-label="Young tree (about B1): you are here"')
    expect(html).toContain('54 words to Tree (about B2)')
    expect(html).toContain('aria-label="Forest (about C2): 1804 words away"')
  })

  test('the next stop starts recall when words are due', () => {
    const onStart = vi.fn()
    const { container } = render(
      <WordGardenHero
        next={{ due: 12, kind: 'due', nextTerm: 'ubiquitous', onStart }}
        stats={stats}
        withDrawer
      />
    )

    expectLandingBudget(container)
    expect(screen.getByText('12 words due')).toBeInTheDocument()
    expect(screen.getByText('Next: ubiquitous')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Start Recall/ }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  test('with nothing due the next stop plants new words', () => {
    render(
      <WordGardenHero
        next={plant}
        stats={stats}
      />
    )

    expect(screen.getByRole('link', { name: 'Explore words' })).toHaveAttribute(
      'href',
      '#vocab-explore'
    )
  })
})
