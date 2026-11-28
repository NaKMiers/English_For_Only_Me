import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
import { expectLandingBudget } from '@/test/landingBudget'

import { DictationSide } from './DictationSide'
import { ListeningJourneyHero } from './ListeningJourneyHero'
import { RecordShelves, type RecordTopic } from './RecordShelves'
import { shelveTopics } from './listeningJourney'

const topic = (id: string, total: number): RecordTopic => ({
  href: `/dictation/${id}`,
  id,
  levelRange: 'A1-B1',
  thumbnailUrl: null,
  title: `Topic ${id}`,
  total,
})

describe('ListeningJourneyHero', () => {
  test('plays toward the next track and names the next stop', () => {
    const html = renderToStaticMarkup(
      <ListeningJourneyHero
        journey={en.common.journey}
        labels={en.dictation}
        next={{
          detail: 'Pick up where you left off',
          href: '/dictation/videos/v1/practice',
          kind: 'video',
          thumbnail: { thumbnailUrl: null, youtubeVideoId: 'abcdefghijk' },
          title: 'A day in London',
        }}
        stats={{
          activeStreakDays: 4,
          completedSegmentCount: 130,
          completedVideoCount: 3,
          dueReviewItemCount: 6,
          firstTryAccuracyTrend: [],
          monthlyPracticeTimeMs: 0,
          repeatedMistakeTypes: [],
          totalVideoCount: 20,
          weakWords: [],
          weeklyPracticeTimeMs: 0,
        }}
      />
    )

    expect(html).toContain('>Track 3<')
    expect(html).toContain('120 sentences to Track 3')
    expect(html).toContain('120 to go')
    // No milestone line under the scrubber: the count sits on it.
    expect(html).not.toContain('data-journey-slot="milestone"')
    expect(html).toContain('3/20')
    expect(html).toContain('href="/dictation/videos/v1/practice"')
    expect(html).toContain('href="/dictation/review"')
    // The video's thumbnail sits in the next stop, in a wider column.
    expect(html).toContain('i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
    expect(html).toContain('minmax(0,26rem)')
  })
})

const stats = {
  activeStreakDays: 0,
  completedSegmentCount: 0,
  completedVideoCount: 0,
  dueReviewItemCount: 0,
  firstTryAccuracyTrend: [],
  monthlyPracticeTimeMs: 0,
  repeatedMistakeTypes: [],
  totalVideoCount: 4,
  weakWords: [],
  weeklyPracticeTimeMs: 0,
}

describe('ListeningJourneyHero budget', () => {
  test('one next stop, one cta, at most 4 chips, drawer handle closed', () => {
    const { container } = render(
      <ListeningJourneyHero
        journey={en.common.journey}
        labels={en.dictation}
        next={{
          detail: 'Spaced review',
          href: '/dictation/review',
          kind: 'review',
          title: '3 sentences to review',
        }}
        stats={stats}
        withDrawer
      />
    )

    expectLandingBudget(container)
    expect(
      screen.getByRole('link', { name: en.dictation.journey.startReview })
    ).toHaveAttribute('href', '/dictation/review')
    expect(
      screen.getByRole('button', { name: en.dictation.journey.side.show })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  test('with nothing to suggest it shows the pick-a-topic line', () => {
    const html = renderToStaticMarkup(
      <ListeningJourneyHero
        journey={en.common.journey}
        labels={en.dictation}
        next={null}
        stats={stats}
      />
    )

    expect(html).toContain(en.dictation.journey.pickTopic)
  })
})

describe('DictationSide', () => {
  test('recent videos first, then latest results and favorites', () => {
    render(
      <DictationSide
        labels={en.dictation.journey.side}
        latestResultsHref="/dictation/videos/v9/results"
        recent={[
          {
            completions: 0,
            favorited: false,
            id: 'v1',
            inProgress: true,
            level: null,
            practiceHref: '/dictation/videos/v1/practice',
            thumbnailUrl: null,
            title: 'A day in London',
            youtubeVideoId: null,
          },
        ]}
      />
    )

    const links = screen.getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/dictation/videos/v1/practice',
      '/dictation/videos/v9/results',
      '/dictation/favorites',
    ])
    for (const link of links) expect(link.className).toContain('hover-pop')
  })
})

describe('RecordShelves', () => {
  test('puts started, new and finished topics on their shelves', () => {
    const html = renderToStaticMarkup(
      <RecordShelves
        labels={en.dictation}
        shelves={shelveTopics(
          [topic('a', 4), topic('b', 2), topic('c', 3)],
          new Map([
            ['a', 1],
            ['b', 2],
          ])
        )}
      />
    )

    expect(html).toContain('On the turntable')
    expect(html).toContain('New records')
    expect(html).toContain('Gold records')
    expect(html).toContain('aria-label="Topic a: 1 of 4 videos done"')
    expect(html).toContain('aria-label="Topic b: 2 of 2 videos done"')
  })
})
