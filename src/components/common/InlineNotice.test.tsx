import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { InlineNotice } from './InlineNotice'

describe('InlineNotice', () => {
  test('error uses danger with an icon, as an alert', () => {
    const { container } = render(
      <InlineNotice tone="error">Could not save.</InlineNotice>
    )

    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('text-danger')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  test('info is a quiet status', () => {
    render(<InlineNotice>Saved offline.</InlineNotice>)

    expect(screen.getByRole('status')).toHaveTextContent('Saved offline.')
  })
})
