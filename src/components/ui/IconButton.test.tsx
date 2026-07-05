import { Search } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { IconButton } from './IconButton'

describe('IconButton', () => {
  test('adds accessible labels and titles to icon-only buttons', () => {
    const html = renderToStaticMarkup(
      <IconButton label="Search study desk">
        <Search aria-hidden="true" />
      </IconButton>
    )

    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Search study desk"')
    expect(html).toContain('title="Search study desk"')
  })
})
