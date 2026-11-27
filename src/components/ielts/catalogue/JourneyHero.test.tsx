import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
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
  test('counts steps and links the next stop straight into its skill', () => {
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
    expect(html).toContain('href="/ielts/t3/reading"')
    expect(html).toContain('Base camp')
  })
})
