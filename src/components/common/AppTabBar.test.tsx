import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

import { AppTabBar } from './AppTabBar'

vi.mock('next/navigation', () => ({ usePathname: () => '/grammar/practice' }))

describe('AppTabBar', () => {
  test('links every active module and marks the current one', () => {
    const html = renderToStaticMarkup(<AppTabBar />)

    expect(html).toContain('aria-label="Primary"')
    for (const href of ['/', '/dictation', '/vocabulary', '/grammar', '/ielts'])
      expect(html).toContain(`href="${href}"`)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/grammar"/)
  })
})
