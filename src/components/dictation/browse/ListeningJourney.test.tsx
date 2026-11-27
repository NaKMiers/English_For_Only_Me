import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'

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
        labels={en.dictation}
        next={{
          detail: 'Pick up where you left off',
          href: '/dictation/videos/v1/practice',
          kind: 'video',
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

    expect(html).toContain('Now playing: Track 3')
    expect(html).toContain('120 sentences to Track 3')
    expect(html).toContain('3/20')
    expect(html).toContain('href="/dictation/videos/v1/practice"')
    expect(html).toContain('href="/dictation/review"')
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
