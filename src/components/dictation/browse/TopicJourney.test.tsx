import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
import { expectLandingBudget } from '@/test/landingBudget'

import type { BrowseSectionGroup, BrowseVideoItem } from './SectionAccordion'
import { pickTopicNextVideo, TopicJourney } from './TopicJourney'

const video = (
  id: string,
  extra: Partial<BrowseVideoItem> = {}
): BrowseVideoItem => ({
  completions: 0,
  favorited: false,
  id,
  inProgress: false,
  level: null,
  practiceHref: `/dictation/videos/${id}/practice`,
  thumbnailUrl: null,
  title: `Video ${id}`,
  youtubeVideoId: null,
  ...extra,
})

const groups = (videos: BrowseVideoItem[][]): BrowseSectionGroup[] =>
  videos.map((items, index) => ({
    key: `s${index}`,
    title: `Section ${index}`,
    videos: items,
  }))

describe('pickTopicNextVideo', () => {
  test('the first unfinished video in course order', () => {
    const next = pickTopicNextVideo(
      groups([[video('a', { completions: 1 })], [video('b'), video('c')]])
    )

    expect(next).toMatchObject({ groupKey: 's1', resume: false })
    expect(next?.video.id).toBe('b')
  })

  test('a half-done video wins over a new one', () => {
    const next = pickTopicNextVideo(
      groups([[video('a')], [video('b', { inProgress: true })]])
    )

    expect(next?.video.id).toBe('b')
    expect(next?.resume).toBe(true)
  })

  test('null when every playable video is done', () => {
    expect(
      pickTopicNextVideo(
        groups([
          [video('a', { completions: 2 })],
          [video('b', { practiceHref: null })],
        ])
      )
    ).toBeNull()
  })
})

describe('TopicJourney', () => {
  test('counts done videos, names the gold gap and links the next video', () => {
    const topic = groups([
      [video('a', { completions: 1 }), video('b'), video('c')],
    ])
    const { container } = render(
      <TopicJourney
        groups={topic}
        journey={en.common.journey}
        labels={en.dictation.topicJourney}
        next={pickTopicNextVideo(topic)}
        thumbnailUrl={null}
        title="Daily life"
      />
    )

    expectLandingBudget(container)
    expect(screen.getByText('2 videos to gold')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute(
      'href',
      '/dictation/videos/b/practice'
    )
  })
})
