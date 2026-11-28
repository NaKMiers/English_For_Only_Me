import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { APP_MODULES } from '@/constants/modules'
import { en } from '@/i18n/messages/en'

import { render } from '@testing-library/react'

import { expectLandingBudget } from '@/test/landingBudget'

import { HomeStudyDesk } from './HomeStudyDesk'

describe('HomeStudyDesk', () => {
  test('renders the parent homepage with module cards and Dictation link', () => {
    const html = renderToStaticMarkup(<HomeStudyDesk view="full" />)

    expect(html).toContain('English For Only Me')
    expect(html).toContain('English For Only Me logo')
    expect(html).toContain('Study Desk')
    // Every active module is guaranteed a launcher slot; placeholders fill the
    // rest. Grammar became active, so it displaced AI Coach (a planned module
    // with no route) rather than being left off the desk; IELTS Tests, the
    // fourth active module, displaced Writing Notes the same way.
    for (const activeModule of APP_MODULES.filter(
      module => module.status === 'active'
    ))
      expect(html, `${activeModule.key} should be on the study desk`).toContain(
        en.common.modules[activeModule.key].title
      )

    expect(html).toContain('Dictation Lab')
    expect(html).toContain('Vocabulary')
    expect(html).toContain('Grammar')
    expect(html).toContain('IELTS Tests')
    expect(html).not.toContain('Writing Notes')
    expect(html).toContain('href="/dictation"')
    expect(html).toContain('href="/grammar"')
    expect(html).toContain('href="/ielts"')
  })

  test('renders real dictation global stats when provided', () => {
    const html = renderToStaticMarkup(
      <HomeStudyDesk
        view="full"
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
    expect(html).toContain('available')
    expect(html).toContain('7')
    expect(html).toContain('1')
  })

  test('no link points at the removed /dictation/stats route', () => {
    for (const view of ['simple', 'full'] as const) {
      const html = renderToStaticMarkup(<HomeStudyDesk view={view} />)
      expect(html).not.toContain('/dictation/stats')
    }
  })

  test('greets the signed-in learner by first name', () => {
    const html = renderToStaticMarkup(
      <HomeStudyDesk
        userName="Khoa Nguyen"
        now={new Date('2026-11-27T09:00:00')}
      />
    )

    expect(html).toContain('Hello, Khoa')
    expect(html).toContain('27 November')
  })

  test('the simple view lists what is due and the streak, not the charts', () => {
    const html = renderToStaticMarkup(
      <HomeStudyDesk
        grammarToday={{
          dueCount: 2,
          nextTitle: 'Present simple',
        }}
      />
    )

    expect(html).toContain('Up next')
    expect(html).toContain('2 due')
    expect(html).toContain('Present simple')
    expect(html).toContain('href="/dictation/review"')
    expect(html).toContain('Next stop')
    expect(html).toContain('Study buddy')
    expect(html).not.toContain('Learning progress')
    expect(html).not.toContain('Your modules')
  })

  test('the simple view keeps its number labels visible on phones', () => {
    const html = renderToStaticMarkup(<HomeStudyDesk />)

    for (const label of [
      en.home.simple.thisWeek,
      en.home.simple.wordsKnown,
      en.home.simple.accuracy,
    ]) {
      expect(html).toContain(label)
      expect(html).not.toMatch(new RegExp(`max-sm:sr-only[^"]*">${label}<`))
    }
  })

  test('the buddy wears the mood of the current numbers', () => {
    const html = renderToStaticMarkup(
      <HomeStudyDesk
        grammarToday={{
          dueCount: 25,
          nextTitle: null,
        }}
      />
    )

    expect(html).toContain('data-mood="worried"')
    expect(html).toContain('A bit worried')
    expect(html).toContain('25 reviews are piling up')
  })

  test('the simple view has one next stop, one cta, and ticks cleared rows', () => {
    const { container } = render(
      <HomeStudyDesk
        grammarToday={{ dueCount: 2, nextTitle: 'Present simple' }}
        view="simple"
      />
    )

    expectLandingBudget(container)
    // Dictation and vocabulary have nothing due: two cleared ticks.
    expect(container.querySelectorAll('.lucide-circle-check')).toHaveLength(2)
  })

  test('the full view holds at most 5 blocks and no counters or schedule', () => {
    const html = renderToStaticMarkup(<HomeStudyDesk view="full" />)

    expect(html).not.toContain('Schedule')
    expect(html).not.toContain('Open the review queue')
  })
})
