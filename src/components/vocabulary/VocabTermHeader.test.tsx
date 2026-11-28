import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { VocabTermHeader } from './VocabTermHeader'

describe('VocabTermHeader', () => {
  test('by default: a heading and a speak button', () => {
    render(<VocabTermHeader term="harbour" />)

    expect(screen.getByRole('heading', { name: 'harbour' })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('inline (inside a button): no nested control, no heading', () => {
    render(
      <button type="button">
        <VocabTermHeader
          inline
          term="harbour"
        />
      </button>
    )

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByRole('button')).toHaveTextContent('harbour')
  })
})
