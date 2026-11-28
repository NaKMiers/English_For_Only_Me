import { render, screen } from '@testing-library/react'
import { Star } from 'lucide-react'
import { describe, expect, test } from 'vitest'

import { StatChip, StatStrip } from './StatChip'

describe('StatChip', () => {
  test('with href it is a link that pops, label in its accessible name', () => {
    render(
      <StatStrip>
        <StatChip
          href="/grammar/practice"
          icon={Star}
          label="Weak spots"
          value="3"
        />
      </StatStrip>
    )

    const link = screen.getByRole('link', { name: /Weak spots\s*3/ })
    expect(link).toHaveAttribute('href', '/grammar/practice')
    expect(link.className).toContain('hover-pop')
  })

  test('without href it is static: no link, never pops', () => {
    const { container } = render(
      <StatStrip>
        <StatChip
          icon={Star}
          label="Stars"
          value="12/30"
        />
      </StatStrip>
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(container.innerHTML).not.toContain('hover-pop')
    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(container.querySelector('dt')?.textContent).toBe('Stars')
  })

  test('the label hides on phones unless labelAlways is set', () => {
    render(
      <StatStrip>
        <StatChip
          icon={Star}
          label="Hidden on phones"
          value="1"
        />
        <StatChip
          icon={Star}
          label="Always shown"
          labelAlways
          value="2"
        />
      </StatStrip>
    )

    expect(screen.getByText('Hidden on phones').className).toContain(
      'max-sm:sr-only'
    )
    expect(screen.getByText('Always shown').className).not.toContain(
      'max-sm:sr-only'
    )
  })
})
