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
      view.getByRole('link', { name: 'Start Practice' }).getAttribute('href')
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

    expect(view.getByText('Completed')).not.toBeNull()
    expect(view.getByText('80%')).not.toBeNull()
    expect(view.getByText(/saved attempts only/)).not.toBeNull()
    expect(view.getByRole('link', { name: 'Practice Again' })).not.toBeNull()
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
    expect(
      view.getByRole('link', { name: 'Continue Practice' })
    ).not.toBeNull()
  })
})
