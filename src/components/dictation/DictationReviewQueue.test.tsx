import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { DictationReviewItemApiRecord } from '@/modules/dictation/types'

import { DictationReviewQueue } from './DictationReviewQueue'

const item = (id: string, videoId = `v${id}`): DictationReviewItemApiRecord =>
  ({
    id,
    label: `Sentence ${id}`,
    priority: 3,
    reason: 'lowAccuracy',
    statsSnapshot: { accuracy: 40 },
    segmentId: `s${id}`,
    status: 'due',
    videoId,
  }) as unknown as DictationReviewItemApiRecord

describe('DictationReviewQueue', () => {
  test('leads with the due count and one Start review into the first sentence', () => {
    const { container } = render(
      <DictationReviewQueue reviewItems={[item('1'), item('2')]} />
    )

    expect(screen.getByText('2 sentences to review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start review' })).toHaveAttribute(
      'href',
      '/dictation/videos/v1/practice?segment=s1'
    )
    // Every row opens its own sentence, not the video's start.
    expect(
      screen.getByRole('link', { name: /Sentence 2/ }).getAttribute('href')
    ).toBe('/dictation/videos/v2/practice?segment=s2')
    // No internal priority number on the rows.
    expect(container.textContent).not.toContain('3')
  })

  test('the head counts every due item, not only the capped list', () => {
    render(
      <DictationReviewQueue
        dueCount={45}
        reviewItems={[item('1'), item('2')]}
      />
    )

    expect(screen.getByText('45 sentences to review')).toBeInTheDocument()
  })

  test('rows past 5 fold behind a disclosure', () => {
    const { container } = render(
      <DictationReviewQueue
        reviewItems={['1', '2', '3', '4', '5', '6', '7'].map(id => item(id))}
      />
    )

    expect(container.querySelector('details')?.textContent).toContain('2 more')
    expect(container.querySelectorAll('details li')).toHaveLength(2)
  })

  test('empty: all caught up, with the way back to the landing', () => {
    render(<DictationReviewQueue reviewItems={[]} />)

    expect(screen.getByText('All caught up')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to Dictation Lab' })
    ).toHaveAttribute('href', '/dictation')
  })

  test('embedded on results: the list only, no second cta', () => {
    render(
      <DictationReviewQueue
        reviewItems={[item('1')]}
        title="Weak sentences"
        variant="embedded"
      />
    )

    expect(screen.queryByRole('link', { name: 'Start review' })).toBeNull()
  })
})
