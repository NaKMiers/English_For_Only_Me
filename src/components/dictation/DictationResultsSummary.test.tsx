import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { DictationVideoStatsRecord } from '@/modules/dictation/types'
import { expectLandingBudget } from '@/test/landingBudget'
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
  test('before any practice: one empty state with one ink action', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty
        progress="notStarted"
        stats={stats}
        title="IELTS video"
        videoId="0123456789abcdef01234567"
      />
    )

    expect(view.getByText('Practice first')).not.toBeNull()
    expect(
      view.getByRole('link', { name: 'Start practice' }).getAttribute('href')
    ).toBe('/dictation/videos/0123456789abcdef01234567/practice')
    expect(view.container.querySelectorAll('[data-empty-state]')).toHaveLength(
      1
    )
    expect(view.getAllByRole('link')).toHaveLength(1)
    expectLandingBudget(view.container)
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
    // No helper sentence under the numbers.
    expect(view.queryByText(/saved attempts only/)).toBeNull()
    expect(view.container.querySelectorAll('[data-next-stop]')).toHaveLength(1)
    expect(view.getByRole('link', { name: 'Practice again' })).not.toBeNull()
  })

  test('in progress: the same empty state, Continue as its one action', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty
        progress="inProgress"
        stats={stats}
        title="IELTS video"
        videoId="0123456789abcdef01234567"
      />
    )

    expect(view.getByText('Practice in progress')).not.toBeNull()
    expect(view.getByRole('link', { name: 'Continue practice' })).not.toBeNull()
    expectLandingBudget(view.container)
  })

  test('the next stop is the next video in the topic', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty={false}
        next={{
          actionLabel: 'Next video',
          detail: 'Next in TED',
          href: '/dictation/videos/abcdef0123456789abcdef01/practice',
          title: 'Another talk',
        }}
        progress="completed"
        stats={stats}
        title="IELTS video"
        videoId="0123456789abcdef01234567"
      />
    )

    expect(
      view.getByRole('link', { name: 'Next video' }).getAttribute('href')
    ).toBe('/dictation/videos/abcdef0123456789abcdef01/practice')
  })
})
