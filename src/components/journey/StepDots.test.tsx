import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { StepDots } from './StepDots'

describe('StepDots', () => {
  test('a static image with its label, done dots filled', () => {
    const { container } = render(
      <StepDots
        done={2}
        label="Step 2 of 5"
        total={5}
      />
    )

    expect(screen.getByRole('img', { name: 'Step 2 of 5' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-dot="done"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-dot="todo"]')).toHaveLength(3)
    expect(container.innerHTML).not.toContain('hover-pop')
  })
})
