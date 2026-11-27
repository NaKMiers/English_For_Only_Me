import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { JourneyRow, ProgressToggle } from './JourneyRow'

describe('JourneyRow', () => {
  test('keeps the side card folded until the toggle slides it out', () => {
    render(
      <JourneyRow side={<p>Recent attempts</p>}>
        <ProgressToggle />
      </JourneyRow>
    )

    const toggle = screen.getByRole('button', {
      name: 'Show recent attempts and weak spots',
    })
    const side = document.getElementById('ielts-progress-side')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(side).toHaveAttribute('inert')

    fireEvent.click(toggle)

    expect(
      screen.getByRole('button', {
        name: 'Hide recent attempts and weak spots',
      })
    ).toHaveAttribute('aria-expanded', 'true')
    expect(side).not.toHaveAttribute('inert')
  })
})
