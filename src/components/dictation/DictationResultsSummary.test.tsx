import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { DictationVideoStatsRecord } from '@/modules/dictation/types'
import { setupDom } from '@/test/setupDom'

import { DictationResultsSummary } from './DictationResultsSummary'

setupDom()

const stats: DictationVideoStatsRecord = {
  commonMissedWords: [],
  completedSegmentCount: 8,
  completionPercentage: 80,
  firstTryWordAccuracy: 72,
  hardestSegments: [],
  mistakeTaxonomy: { extra: 0, missing: 0, spellingVariant: 0, wrong: 0 },
  overallWordAccuracy: 85,
  replayCount: 0,
  retryCount: 0,
  revealCount: 0,
  segmentCount: 10,
  skipCount: 0,
  timeSpentMs: 0,
}

describe('DictationResultsSummary', () => {
  test('renders the not-started empty state', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty
        progress="notStarted"
        stats={stats}
        title="IELTS video"
        videoId="0123456789abcdef01234567"
      />
    )

    expect(view.getByText('Results')).not.toBeNull()
    expect(view.getByText(/Practice the video first/)).not.toBeNull()
    expect(
      view.getByRole('link', { name: 'Start practice' }).getAttribute('href')
    ).toBe('/dictation/videos/0123456789abcdef01234567/practice')
  })

  test('renders the completed state with hero numbers', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty={false}
        progress="completed"
        stats={stats}
        thumbnailUrl="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        title="IELTS video"
        videoId="0123456789abcdef01234567"
        youtubeVideoId="dQw4w9WgXcQ"
      />
    )

    // The head leads with the result, then one next stop.
    expect(view.getByText('72%')).not.toBeNull()
    expect(view.getByText('80% done: 8 of 10 sentences')).not.toBeNull()
    expect(view.getByText(/saved attempts only/)).not.toBeNull()
    expect(view.container.querySelectorAll('[data-next-stop]')).toHaveLength(1)
    expect(view.getByRole('link', { name: 'Practice again' })).not.toBeNull()
  })

  test('shows an in-progress eyebrow while a session is active', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty
        progress="inProgress"
        stats={stats}
        title="IELTS video"
        videoId="0123456789abcdef01234567"
      />
    )

    expect(view.getByText('In progress')).not.toBeNull()
    expect(view.getByRole('link', { name: 'Continue practice' })).not.toBeNull()
  })

  test('the next stop is the weak-sentence review when one is due', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty={false}
        next={{
          actionLabel: 'Start review',
          detail: 'Spaced review',
          href: '/dictation/review',
          title: 'Review 3 weak sentences',
        }}
        progress="completed"
        stats={stats}
        title="IELTS video"
        videoId="0123456789abcdef01234567"
      />
    )

    expect(
      view.getByRole('link', { name: 'Start review' }).getAttribute('href')
    ).toBe('/dictation/review')
  })
})
