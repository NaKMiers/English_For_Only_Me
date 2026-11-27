import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

import { I18nProvider } from '@/i18n/client'
import { vi as viMessages } from '@/i18n/messages/vi'

import { AccountProvider } from './AccountProvider'
import { AppSidebar, isActiveHref } from './AppSidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/dictation/review' }))
vi.mock('@/i18n/actions', () => ({ setLocaleAction: vi.fn() }))

describe('AppSidebar', () => {
  test('renders the primary rail and marks the current module', () => {
    const html = renderToStaticMarkup(<AppSidebar />)

    expect(html).toContain('aria-label="Primary"')
    expect(html).toContain('href="/dictation"')
    expect(html).toContain('href="/ielts"')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-label="Dictation"[^>]*aria-current="page"/)
  })

  test('carries the EN / VI switch under the theme toggle', () => {
    const html = renderToStaticMarkup(<AppSidebar />)

    // One round button: shows the current language, offers the other one.
    expect(html).toContain('aria-label="Switch to Vietnamese"')
    expect(html).toMatch(/lang="en"[^>]*>.*EN</)
  })

  test('labels the rail in Vietnamese under the Vietnamese provider', () => {
    const html = renderToStaticMarkup(
      <I18nProvider
        locale="vi"
        messages={viMessages}
      >
        <AppSidebar />
      </I18nProvider>
    )

    expect(html).toContain('aria-label="Điều hướng chính"')
    expect(html).toMatch(/aria-label="Chính tả"[^>]*aria-current="page"/)
    expect(html).toMatch(/lang="vi"[^>]*>.*VI</)
  })

  test('puts the account avatar at the foot of the rail', () => {
    const html = renderToStaticMarkup(
      <AccountProvider
        value={{
          account: {
            firstName: 'Khoa',
            image: null,
            initial: 'K',
            isAdmin: false,
          },
          enabled: true,
        }}
      >
        <AppSidebar />
      </AccountProvider>
    )

    expect(html).toMatch(/aria-haspopup="menu"[^>]*>.*>K<.*sr-only">Khoa</)
  })

  test('home only matches itself, modules match their subtree', () => {
    expect(isActiveHref('/', '/')).toBe(true)
    expect(isActiveHref('/dictation', '/')).toBe(false)
    expect(isActiveHref('/dictation/stats', '/dictation')).toBe(true)
    expect(isActiveHref('/dictationx', '/dictation')).toBe(false)
  })
})
