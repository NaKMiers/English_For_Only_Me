import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import { TestPath } from './TestPath'

const test_ = (id: string, number: number): IeltsCatalogEntry => ({
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
  title: `IELTS 21 Test ${number}`,
  track: 'academic',
  version: 1,
})

describe('TestPath', () => {
  test('draws a book as a line of stations ending in its trophy', () => {
    render(
      <TestPath
        bands={{ a: { listening: 6.5, reading: 7 }, b: { listening: 6 } }}
        catalog={[test_('a', 1), test_('b', 2), test_('c', 3)]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'IELTS 21 Academic Test 1: cleared' })
    ).toHaveAttribute('href', '/ielts/a')
    expect(
      screen.getByRole('link', {
        name: 'IELTS 21 Academic Test 2: 1 of 2 skills',
      })
    ).toBeTruthy()
    // The started test is where the learner is.
    expect(screen.getByText('You are here').closest('a')).toHaveAttribute(
      'href',
      '/ielts/b'
    )
    expect(
      screen.getByRole('img', { name: 'Reading: best band 7.0' })
    ).toBeTruthy()
    expect(
      screen.getByRole('img', {
        name: 'IELTS 21 Academic: 1 of 3 tests cleared',
      })
    ).toBeTruthy()
  })
})
