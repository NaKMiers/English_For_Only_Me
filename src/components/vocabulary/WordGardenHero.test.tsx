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
    // The young tree's stage badge is gone: the vine names the stage.
    expect(html).not.toContain('about B1</span>')
  })

  test('writes the words to go above every stage still ahead', () => {
    const { container } = render(
      <WordGardenHero
        next={plant}
        stats={stats}
      />
    )
    const segments = [
      ...container.querySelectorAll('[data-garden-segment]'),
    ].map(item => [
      item.getAttribute('data-garden-segment'),
      item.querySelector('.max-sm\\:hidden')?.textContent,
    ])

    expect(segments).toEqual([
      ['current', '54 to go'],
      ['ahead', '750 to go'],
      ['ahead', '1,000 to go'],
    ])
  })

  test('lifts the chips beside the headline', () => {
    const { container } = render(
      <WordGardenHero
        next={plant}
        stats={stats}
      />
    )
    const header = container.querySelector('[data-journey-slot="headline"]')
      ?.parentElement?.parentElement

    expect(
      header?.querySelector('[data-journey-slot="stats"] [data-stat-strip]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-journey-slot="milestone"]')
    ).toBeNull()
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
