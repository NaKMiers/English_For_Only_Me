import { render, screen } from '@testing-library/react'
import { Star } from 'lucide-react'
import { describe, expect, test } from 'vitest'

import { expectLandingBudget } from '@/test/landingBudget'

import { JourneyCard, JourneyHeadline, MilestoneNote } from './JourneyCard'
import { NextStopCard } from './NextStopCard'
import { StatChip, StatStrip } from './StatChip'

describe('JourneyCard', () => {
  test('labelled section with slots in order and the landing budget met', () => {
    const { container } = render(
      <JourneyCard
        headline={
          <JourneyHeadline
            total="of 120"
            unit="lessons passed"
            value={42}
          />
        }
        metaphor={<div>staircase</div>}
        milestone={<MilestoneNote>3 lessons to finish A2</MilestoneNote>}
        module="grammar"
        nextStop={
          <NextStopCard
            actionLabel="Start lesson"
            href="/grammar/lessons/x"
            pinLabel="Next stop"
            title="Lesson"
          />
        }
        stats={
          <StatStrip>
            <StatChip
              icon={Star}
              label="Stars"
              value="1"
            />
            <StatChip
              href="/grammar/practice"
              icon={Star}
              label="Weak"
              value="2"
            />
          </StatStrip>
        }
        title="Your climb"
        titleId="grammar-journey-title"
      />
    )

    expect(
      screen.getByRole('region', { name: 'Your climb' })
    ).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('lessons passed')).toBeInTheDocument()
    expect(
      [...container.querySelectorAll('[data-journey-slot]')].map(element =>
        element.getAttribute('data-journey-slot')
      )
    ).toEqual(['title', 'headline', 'metaphor', 'milestone', 'stats', 'next'])
    expect(container.firstElementChild?.className).toContain(
      'from-pastel-lilac'
    )
    expectLandingBudget(container)
  })
})
