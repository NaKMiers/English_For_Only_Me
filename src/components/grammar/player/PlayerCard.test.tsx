import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { ExplainCard } from '@/modules/grammar/course/types'

import { ExplainCardView } from './PlayerCard'

const card = {
  body: 'I am, you are.',
  examples: [],
  id: 'u01-l01-c01',
  kind: 'explain',
  title: 'To be',
} as ExplainCard

describe('ExplainCardView', () => {
  test('shows the Remember tag in a lesson', () => {
    render(<ExplainCardView card={card} />)

    expect(screen.getByText('Remember')).toBeInTheDocument()
  })

  test('hideTag drops it (the notes page, where every card would repeat it)', () => {
    render(
      <ExplainCardView
        card={card}
        hideTag
      />
    )

    expect(screen.queryByText('Remember')).toBeNull()
    expect(screen.getByRole('heading', { name: 'To be' })).toBeInTheDocument()
  })
})
