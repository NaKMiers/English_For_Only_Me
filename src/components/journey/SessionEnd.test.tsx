import { render, screen } from '@testing-library/react'
import { Clock3, Target } from 'lucide-react'
import { describe, expect, test } from 'vitest'

import { expectLandingBudget } from '@/test/landingBudget'

import { NextStopCard } from './NextStopCard'
import { SessionEnd } from './SessionEnd'
import { StatChip, StatStrip } from './StatChip'

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

  test('focusTitle moves focus to the heading on mount, off by default', () => {
    const { rerender } = render(
      <SessionEnd
        headline={{ value: '1' }}
        module="grammar"
        nextStop={<a href="/next">Next</a>}
        title="Done"
        wins="win"
      />
    )

    expect(document.activeElement).toBe(document.body)

    rerender(
      <SessionEnd
        focusTitle
        headline={{ value: '1' }}
        module="grammar"
        nextStop={<a href="/next">Next</a>}
        title="Done again"
        titleId="focused-end"
        wins="win"
      />
    )

    expect(document.activeElement).toHaveTextContent('Done again')
  })

  test('stats chips sit beside the headline, inside the wins header', () => {
    const { container } = render(
      <SessionEnd
        headline={{ value: '3', unit: 'stars' }}
        journeyStep="+1 in Unit 3"
        module="grammar"
        nextStop={
          <NextStopCard
            actionLabel="Start"
            href="/grammar/lessons/next"
            pinLabel="Next stop"
            title="Past simple"
            variant="compact"
          />
        }
        stats={
          <StatStrip label="Stats">
            <StatChip
              icon={Target}
              label="Accuracy"
              value="90%"
            />
            <StatChip
              icon={Clock3}
              label="Time"
              value="2:10"
            />
          </StatStrip>
        }
        title="Lesson done!"
      />
    )

    const header = container.querySelector('[data-session-slot="wins"]')
    const stats = header?.querySelector('[data-session-slot="stats"]')
    expect(stats).not.toBeNull()
    expect(stats?.querySelectorAll('[data-stat-chip="static"]')).toHaveLength(2)
    // The chips share the heading's row, not a row of their own.
    expect(
      stats?.parentElement?.contains(
        screen.getByRole('heading', { name: 'Lesson done!' })
      )
    ).toBe(true)

    const slots = [...container.querySelectorAll('[data-session-slot]')].map(
      element => element.getAttribute('data-session-slot')
    )
    expect(slots).toEqual(['wins', 'stats', 'journey', 'next'])
    expectLandingBudget(container)
  })
})
