import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { AppTopbar } from './AppTopbar'

describe('AppTopbar', () => {
  test('renders the brand logo, primary navigation, and labelled icon actions', () => {
    const html = renderToStaticMarkup(<AppTopbar activeHref="/dictation" />)

    expect(html).toContain('English For Only Me logo')
    expect(html).toContain('aria-label="Primary"')
    expect(html).toContain('href="/dictation"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('aria-label="Open Dictation Lab"')
    expect(html).toContain('title="Open settings"')
  })
})
