import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

import { AppTopbar } from './AppTopbar'

// AuthControl is an async server component (reads the JWT session); stub it so
// the topbar renders synchronously under renderToStaticMarkup.
vi.mock('./AuthControl', () => ({ AuthControl: () => null }))

describe('AppTopbar', () => {
  test('renders the brand logo and primary navigation', () => {
    const html = renderToStaticMarkup(<AppTopbar activeHref="/dictation" />)

    expect(html).toContain('English For Only Me logo')
    expect(html).toContain('aria-label="Primary"')
    expect(html).toContain('href="/dictation"')
    expect(html).toContain('aria-current="page"')
  })
})
