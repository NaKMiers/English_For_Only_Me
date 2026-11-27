import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

import { AppSidebar, isActiveHref } from './AppSidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/dictation/review' }))

describe('AppSidebar', () => {
  test('renders the primary rail and marks the current module', () => {
    const html = renderToStaticMarkup(<AppSidebar />)

    expect(html).toContain('aria-label="Primary"')
    expect(html).toContain('href="/dictation"')
    expect(html).toContain('href="/ielts"')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-label="Dictation"[^>]*aria-current="page"/)
  })

  test('home only matches itself, modules match their subtree', () => {
    expect(isActiveHref('/', '/')).toBe(true)
    expect(isActiveHref('/dictation', '/')).toBe(false)
    expect(isActiveHref('/dictation/stats', '/dictation')).toBe(true)
    expect(isActiveHref('/dictationx', '/dictation')).toBe(false)
  })
})
