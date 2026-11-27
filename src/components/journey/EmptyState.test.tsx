import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  test('explains the state and offers one next action', () => {
    render(
      <EmptyState
        action={{ href: '/dictation', label: 'Browse topics' }}
        body="Star a video to keep it here."
        title="No favorites yet"
      />
    )

    expect(screen.getByText('No favorites yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse topics' })).toHaveAttribute(
      'href',
      '/dictation'
    )
  })
})
