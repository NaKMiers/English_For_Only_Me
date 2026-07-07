import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { setupDom } from '@/test/setupDom'

import { DictationResultsSummary } from './DictationResultsSummary'

setupDom()

describe('DictationResultsSummary', () => {
  test('renders the empty results state', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty
        title="IELTS video"
        videoId="0123456789abcdef01234567"
        videoStatus="inProgress"
      />
    )

    expect(view.getByText('Results')).not.toBeNull()
    expect(view.getByText(/Practice the video first/)).not.toBeNull()
    expect(
      view.getByRole('link', { name: 'Continue Practice' }).getAttribute('href')
    ).toBe('/dictation/videos/0123456789abcdef01234567/practice')
  })

  test('renders the completed results state', () => {
    const view = render(
      <DictationResultsSummary
        isEmpty={false}
        thumbnailUrl="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        title="IELTS video"
        videoId="0123456789abcdef01234567"
        videoStatus="completed"
        youtubeVideoId="dQw4w9WgXcQ"
      />
    )

    expect(view.getByText('Completed')).not.toBeNull()
    expect(view.getByAltText('Thumbnail for IELTS video')).not.toBeNull()
    expect(view.getByText(/saved attempts only/)).not.toBeNull()
    expect(view.getByRole('link', { name: 'Practice Again' })).not.toBeNull()
  })
})
