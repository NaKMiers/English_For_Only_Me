import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { AppCredits } from './AppCredits'

describe('AppCredits', () => {
  test('shows the copyright year and the author credit', () => {
    const html = renderToStaticMarkup(<AppCredits />)

    expect(html).toContain('© 2026 English For Only Me. All rights reserved.')
    expect(html).toContain('Developed by')
    expect(html).toContain('Nguyen Anh Khoa')
    expect(html).toContain('rel="noreferrer"')
  })
})
