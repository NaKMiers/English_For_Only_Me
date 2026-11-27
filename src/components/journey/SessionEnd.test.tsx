import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SessionEnd } from './SessionEnd'

describe('SessionEnd', () => {
  test('wins, journey step, fix-up, next stop: in that order whatever the props', () => {
    const { container } = render(
      <SessionEnd
        nextStop={<a href="/next">Next lesson</a>}
        fixUp={{ items: ['miss one'], moreLabel: '0 more', title: 'To fix' }}
        journeyStep="+1 step, 2 to the checkpoint"
        wins="9 of 10 right"
        headline={{ value: '3', unit: 'stars' }}
        module="grammar"
        title="Lesson done!"
      />
    )

    const slots = [...container.querySelectorAll('[data-session-slot]')].map(
      element => element.getAttribute('data-session-slot')
    )
    expect(slots).toEqual(['wins', 'journey', 'fixup', 'next'])
    expect(
      screen.getByRole('heading', { name: 'Lesson done!' })
    ).toBeInTheDocument()
  })

  test('a fix-up list longer than 3 shows the first and folds the rest', () => {
    const { container } = render(
      <SessionEnd
        fixUp={{
          items: ['a', 'b', 'c', 'd'],
          moreLabel: '3 more',
          title: 'To fix',
        }}
        headline={{ value: '60%' }}
        module="dictation"
        nextStop={<a href="/next">Next</a>}
        title="Done"
        wins="win"
      />
    )

    const details = container.querySelector('details')
    expect(details).not.toBeNull()
    expect(details?.querySelector('summary')?.textContent).toContain('3 more')
    expect(details?.querySelectorAll('li')).toHaveLength(3)
    expect(container.querySelectorAll('li')).toHaveLength(4)
  })

  test('a short fix-up list stays open', () => {
    const { container } = render(
      <SessionEnd
        fixUp={{ items: ['a', 'b'], moreLabel: '', title: 'To fix' }}
        headline={{ value: '1' }}
        module="vocabulary"
        nextStop={<a href="/next">Next</a>}
        title="Done"
        wins="win"
      />
    )

    expect(container.querySelector('details')).toBeNull()
  })
})
