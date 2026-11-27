import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { Segmented } from './segmented'

describe('Segmented', () => {
  test('selected uses cta, aria-pressed follows the value, 44px targets', () => {
    const onChange = vi.fn()

    render(
      <Segmented
        label="Mode"
        onChange={onChange}
        options={[
          { label: 'Practice', value: 'practice' },
          { label: 'Mock', value: 'mock' },
        ]}
        value="practice"
      />
    )

    const practice = screen.getByRole('button', { name: 'Practice' })
    const mock = screen.getByRole('button', { name: 'Mock' })

    expect(practice).toHaveAttribute('aria-pressed', 'true')
    expect(practice.className).toContain('bg-cta')
    expect(mock).toHaveAttribute('aria-pressed', 'false')
    expect(mock.className).toContain('hover-pop')
    expect(mock.className).toContain('min-h-11')

    fireEvent.click(mock)
    expect(onChange).toHaveBeenCalledWith('mock')
  })
})
