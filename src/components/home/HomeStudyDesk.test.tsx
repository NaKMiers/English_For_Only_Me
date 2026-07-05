import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { HomeStudyDesk } from './HomeStudyDesk'

describe('HomeStudyDesk', () => {
  test('renders the parent homepage with module cards and Dictation link', () => {
    const html = renderToStaticMarkup(<HomeStudyDesk />)

    expect(html).toContain('English For Only Me')
    expect(html).toContain('English For Only Me logo')
    expect(html).toContain('Your English training desk.')
    expect(html).toContain('Dictation Lab')
    expect(html).toContain('Vocabulary')
    expect(html).toContain('Writing Notes')
    expect(html).toContain('AI Coach')
    expect(html).toContain('href="/dictation"')
  })

  test('renders real dictation global stats when provided', () => {
    const html = renderToStaticMarkup(
      <HomeStudyDesk
        dictationStats={{
          activeStreakDays: 5,
          completedSegmentCount: 42,
          completedVideoCount: 3,
          dueReviewItemCount: 7,
          firstTryAccuracyTrend: [],
          monthlyPracticeTimeMs: 360_000,
          repeatedMistakeTypes: [],
          totalVideoCount: 4,
          weakWords: [
            {
              count: 2,
              word: 'available',
            },
          ],
          weeklyPracticeTimeMs: 120_000,
        }}
      />
    )

    expect(html).toContain('5')
    expect(html).toContain('3')
    expect(html).toContain('4 saved videos')
    expect(html).toContain('7')
    expect(html).toContain('1')
  })
})
