import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'

import { DictationStatsStrip } from './DictationStatsStrip'

describe('DictationStatsStrip', () => {
  test('shows the four headline numbers and links to the full stats', () => {
    const html = renderToStaticMarkup(
      <DictationStatsStrip
        labels={en.dictation}
        stats={{
          activeStreakDays: 4,
          completedSegmentCount: 120,
          completedVideoCount: 3,
          dueReviewItemCount: 2,
          firstTryAccuracyTrend: [],
          monthlyPracticeTimeMs: 90 * 60_000,
          repeatedMistakeTypes: [],
          totalVideoCount: 12,
          weakWords: [],
          weeklyPracticeTimeMs: 25 * 60_000,
        }}
      />
    )

    expect(html).toContain('aria-label="Your listening progress"')
    expect(html).toContain('>3<')
    expect(html).toContain('>120<')
    expect(html).toContain('25m')
    expect(html).toContain('1h 30m this month')
    expect(html).toContain('2 review items due')
    expect(html).toContain('href="/dictation/stats"')
  })
})
