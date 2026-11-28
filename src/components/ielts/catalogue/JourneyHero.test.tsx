import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
import { expectLandingBudget } from '@/test/landingBudget'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import { groupCatalogue } from './catalogueGroups'
import { JourneyHero } from './JourneyHero'

const entry = (id: string, number: number): IeltsCatalogEntry => ({
  createdAt: null,
  description: '',
  id,
  publishedAt: null,
  series: '',
  skills: [
    { mockReady: true, parts: 4, skill: 'listening' },
    { mockReady: true, parts: 3, skill: 'reading' },
  ],
  slug: id,
  tags: [],
  targetBand: 7,
  title: `IELTS 15 Test ${number}`,
  track: 'academic',
  version: 1,
})

describe('JourneyHero', () => {
  test('counts steps and marks the steps left in every stage', () => {
    const html = renderToStaticMarkup(
      <JourneyHero
        attempts={[]}
        bands={{ t3: { listening: 6.5 } }}
        groups={groupCatalogue([entry('t1', 1), entry('t3', 3)])}
        messages={en}
        now={new Date('2026-11-28T00:00:00Z')}
        overall={null}
      />
    )

    expect(html).toContain('aria-label="1 of 4 steps')
    expect(html).toContain('Base camp reached')
    expect(html).toContain('1 step left to Ridge')
    expect(html).toContain('1 step left to Summit')
    // One step reads in the singular.
    expect(html).toContain('>step taken<')
    expect(html).not.toContain('>steps taken<')
  })

  test('lifts the chips to the top and leaves out the next stop', () => {
    const { container } = render(
      <JourneyHero
        attempts={[]}
        bands={{}}
        groups={groupCatalogue([entry('t1', 1)])}
        messages={en}
        now={new Date('2026-11-28T00:00:00Z')}
        overall={null}
      />
    )
    const header = container.querySelector('[data-journey-slot="headline"]')
      ?.parentElement?.parentElement

    expect(
      header?.querySelector('[data-journey-slot="stats"] [data-stat-strip]')
    ).not.toBeNull()
    expect(container.querySelector('[data-journey-slot="next"]')).toBeNull()
    expectLandingBudget(container, { ctas: 0, nextStops: 0 })
  })

  test('everything banded closes every stage', () => {
    const html = renderToStaticMarkup(
      <JourneyHero
        attempts={[]}
        bands={{ t1: { listening: 7, reading: 7 } }}
        groups={groupCatalogue([entry('t1', 1)])}
        messages={en}
        now={new Date('2026-11-28T00:00:00Z')}
        overall={null}
      />
    )

    expect(html.match(/data-journey-stage="done"/g)).toHaveLength(4)
    expect(html).not.toContain('step left')
    expect(html).not.toContain('href="/ielts/t1/')
  })
})
