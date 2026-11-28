import { render, screen } from '@testing-library/react'
import { Trophy } from 'lucide-react'
import { describe, expect, test } from 'vitest'

import { NextStopCard } from './NextStopCard'

function ctaCount(container: HTMLElement) {
  return [...container.querySelectorAll('[class]')].filter(element =>
    /(^|\s)bg-cta(\s|$)/.test(element.getAttribute('class') ?? '')
  ).length
}

describe('NextStopCard', () => {
  test('one cta straight into the work, marked as the next stop', () => {
    const { container } = render(
      <NextStopCard
        actionLabel="Start lesson"
        detail="Unit 2"
        href="/grammar/lessons/u02-l01"
        pinLabel="Next stop"
        title="Present perfect"
      />
    )

    expect(ctaCount(container)).toBe(1)
    expect(container.querySelector('[data-next-stop]')).toHaveAttribute(
      'id',
      'next-stop'
    )
    expect(screen.getByRole('link', { name: 'Start lesson' })).toHaveAttribute(
      'href',
      '/grammar/lessons/u02-l01'
    )
  })

  test('compact variant keeps one cta too', () => {
    const { container } = render(
      <NextStopCard
        actionLabel="Reading"
        href="/ielts/t/reading"
        id="ielts-next"
        pinLabel="Next stop"
        title="Test 2"
        variant="compact"
      />
    )

    expect(ctaCount(container)).toBe(1)
    expect(container.querySelector('#ielts-next')).not.toBeNull()
  })

  test('done state shows the all-clear text and no button', () => {
    const { container } = render(
      <NextStopCard
        actionLabel="Start"
        done={{ icon: <Trophy />, text: 'Every lesson is done' }}
        href="/grammar"
        pinLabel="Next stop"
        title="Ignored"
      />
    )

    expect(screen.getByText('Every lesson is done')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    expect(ctaCount(container)).toBe(0)
  })

  test('media sits left of the title with the pin on its corner', () => {
    const { container } = render(
      <NextStopCard
        actionLabel="Continue"
        detail="Pick up where you left off"
        href="/dictation/videos/v1/practice"
        media={<span data-testid="thumb" />}
        pinLabel="Next stop"
        size="sm"
        title="A day in London"
      />
    )
    const thumb = screen.getByTestId('thumb')

    expect(thumb.parentElement?.textContent).toContain('Next stop')
    expect(
      screen.getByRole('heading', { name: 'A day in London' })
    ).toBeInTheDocument()
    expect(ctaCount(container)).toBe(1)
  })
})
