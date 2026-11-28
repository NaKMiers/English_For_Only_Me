import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { SaveWordButton } from './SaveWordButton'

vi.mock('@/components/common/OutboxOwnerProvider', () => ({
  useClientOutbox: () => null,
}))

describe('SaveWordButton', () => {
  test('one labelled button with the term', () => {
    render(
      <SaveWordButton
        context=""
        term="harbour"
      />
    )

    expect(screen.getByRole('button', { name: 'Save "harbour"' })).toBeEnabled()
  })

  test('a word the learner already has starts saved', () => {
    render(
      <SaveWordButton
        context=""
        initiallySaved
        term="harbour"
      />
    )

    expect(
      screen.getByRole('button', { name: 'Saved "harbour"' })
    ).toBeDisabled()
  })
})
