import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { en } from '@/i18n/messages/en'

import { VideoListPage } from './VideoListPage'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dictation',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('VideoListPage', () => {
  test('an empty list offers the way back to the topics', () => {
    render(
      <VideoListPage
        canFavorite
        emptyTitle={en.dictation.favorites.empty}
        items={[]}
        messages={en}
        title={en.dictation.favorites.title}
        topbarSubtitle={en.dictation.meta.favoritesSubtitle}
      />
    )

    expect(screen.getByText(en.dictation.favorites.empty)).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: en.dictation.browse.allTopics })
        .length
    ).toBeGreaterThan(0)
    expect(document.querySelector('[data-empty-state] a')).toHaveAttribute(
      'href',
      '/dictation'
    )
  })

  test('a list shows the record card and rings the next unplayed video', () => {
    render(
      <VideoListPage
        canFavorite={false}
        emptyTitle="none"
        items={[
          {
            completions: 0,
            favorited: false,
            id: 'v1',
            inProgress: false,
            level: 'B1',
            practiceHref: '/dictation/videos/v1/practice',
            thumbnailUrl: null,
            title: 'Lesson one',
            youtubeVideoId: null,
          },
        ]}
        messages={en}
        title={en.dictation.browse.uncategorized}
        topbarSubtitle={en.dictation.meta.browseSubtitle}
      />
    )

    // No next stop row: the next video's card is ringed and has the id the
    // floating Continue scrolls to.
    expect(document.querySelectorAll('[data-next-stop]')).toHaveLength(0)
    const card = document.getElementById('video-card-v1')

    expect(card).toHaveAttribute('href', '/dictation/videos/v1/practice')
    expect(card?.closest('li')?.className).toContain('ring-brand/40')
  })
})
