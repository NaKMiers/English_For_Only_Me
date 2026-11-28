import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { VocabStatsRecord } from '@/modules/vocabulary/types'
import { expectLandingBudget } from '@/test/landingBudget'

import { VocabularyLanding } from './VocabularyLanding'

const stats: VocabStatsRecord = {
  accuracyPercent: 80,
  activeStreakDays: 3,
  alreadyKnowCount: 20,
  dailyGrowth: [],
  dueTodayCount: 0,
  hardestWords: [],
  learnedTodayCount: 1,
  learningCount: 4,
  masteredCount: 2,
  overdueCount: 0,
  reviewsTodayCount: 0,
  totalKnownCount: 26,
  totalStartedCount: 30,
}

function renderLanding(dueCount: number) {
  return render(
    <VocabularyLanding
      dueCount={dueCount}
      errorMessage={null}
      nextTerm={dueCount > 0 ? 'harbour' : null}
      onStartRecall={vi.fn()}
      stats={{ ...stats, dueTodayCount: dueCount }}
      statusMessage={null}
    >
      <div id="vocab-explore">deck</div>
    </VocabularyLanding>
  )
}

describe('VocabularyLanding', () => {
  test('cards due: one small next stop into recall, no float', () => {
    const { container } = renderLanding(3)

    expect(screen.getByText('Next: harbour')).toBeInTheDocument()
    expectLandingBudget(container, { nextStops: 1 })
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
  })

  test('nothing due: no next stop, the Continue float leads to the deck', async () => {
    const { container } = renderLanding(0)

    // The card budget is checked before the float (fixed, outside the card)
    // measures and shows.
    expectLandingBudget(container, { ctas: 0, nextStops: 0 })
    expect(container.querySelector('a[href="#vocab-explore"]')).toBeNull()

    // Give the deck a size so the float can point at it.
    document.getElementById('vocab-explore')!.getBoundingClientRect = () =>
      ({ bottom: 900, height: 100, top: 800 }) as DOMRect
    window.dispatchEvent(new Event('resize'))
    expect(
      await screen.findByRole('button', { name: 'Continue' })
    ).toBeInTheDocument()
  })
})
